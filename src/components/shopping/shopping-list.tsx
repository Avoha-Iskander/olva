"use client";

import { Check, CloudOff, Flag, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { reloadShoppingLines, setLineChecked, startShopping } from "@/app/(app)/courses/actions";
import { addListLine } from "@/app/(app)/listes/actions";
import { AisleHeading } from "@/components/lists/aisle-heading";
import { ItemCombobox } from "@/components/recipe-form/item-combobox";
import { NewItemDialog } from "@/components/recipe-form/new-item-dialog";
import { FinishShopping } from "@/components/shopping/finish-shopping";
import { Button } from "@/components/ui/button";
import type { Aisle, CatalogueItem } from "@/lib/catalogue";
import type { ListStatus } from "@/lib/lists";
import {
  canToggle,
  mergePending,
  type PendingCheck,
  stillRelevant,
  syncBanner,
  toggleOffline,
} from "@/lib/offline-queue";
import { loadQueue, loadSavedList, saveList, saveQueue } from "@/lib/offline-store";
import {
  applyChange,
  type LineChange,
  progress,
  setChecked,
  type ShoppingLine,
  shoppingGroups,
} from "@/lib/shopping-lines";
import { createClient } from "@/lib/supabase/client";
import { formatQuantity } from "@/lib/units";
import { cn } from "@/lib/utils";

type Props = {
  listId: string;
  status: ListStatus;
  userId: string | null;
  initialLines: ShoppingLine[];
  initialNames: Record<string, string>; // noms des personnes qui ont coché
  ownerName: string | null; // liste qu'on me partage : nom de son créateur
  catalogue: CatalogueItem[];
  aisles: Aisle[];
};

/** En ligne ? Suivi des événements « online » / « offline » du navigateur. */
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true, // rendu serveur : toujours « en ligne »
  );

/**
 * Écran de courses (US-CRS-01, US-CRS-02) : la liste par rayon, des cases larges.
 * Temps réel : l'écran s'abonne aux changements des lignes de CETTE liste (Supabase
 * Realtime). Une coche faite sur un autre téléphone apparaît ici aussitôt.
 * Affichage immédiat : ma coche s'affiche avant la réponse du serveur, et revient en
 * arrière si l'enregistrement échoue.
 * Hors ligne (lot 6.3) : la liste est gardée sur le téléphone (IndexedDB) ; les coches
 * vont dans une file d'attente, envoyée au retour du réseau (« coché gagne »).
 */
export function ShoppingList(props: Props) {
  const { listId, userId } = props;
  const router = useRouter();
  const [names, setNamesState] = useState(props.initialNames);
  const namesRef = useRef(props.initialNames);
  const setNames = (next: Record<string, string>) => {
    namesRef.current = next;
    setNamesState(next);
  };
  const [lines, setLinesState] = useState(props.initialLines);
  // Copie toujours à jour des lignes : les changements reçus en temps réel sont calculés
  // à partir d'elle (la fonction passée à setState peut s'exécuter plus tard)
  const linesRef = useRef(props.initialLines);
  // useCallback : la même fonction à chaque affichage (utilisée dans les effets plus bas)
  const setLines = useCallback(
    (next: ShoppingLine[]) => {
      linesRef.current = next;
      setLinesState(next);
      // Chaque version de la liste est gardée sur le téléphone, pour l'ouvrir hors ligne
      void saveList(listId, {
        lines: next,
        names: namesRef.current,
        savedAt: new Date().toISOString(),
      });
    },
    [listId],
  );
  const [items, setItems] = useState(props.catalogue);
  const [newItemName, setNewItemName] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Abonnement au temps réel actif ? (repère data-realtime, utilisé par les tests)
  const [live, setLive] = useState(false);
  const [adding, startAdding] = useTransition();
  const online = useOnline();
  // File des coches faites hors ligne, pas encore envoyées
  const [pending, setPendingState] = useState<PendingCheck[]>([]);
  const pendingRef = useRef<PendingCheck[]>([]);
  const setPending = (next: PendingCheck[]) => {
    pendingRef.current = next;
    setPendingState(next);
    void saveQueue(listId, next);
  };
  const [syncing, setSyncing] = useState(false);
  // Courses terminées (ici ou sur un autre téléphone) : les cases sont bloquées
  const [finished, setFinished] = useState(false);
  // Page gardée par le service worker : la liste s'ouvrira sans réseau (repère pour les tests)
  const [offlineReady, setOfflineReady] = useState(false);

  // Relecture complète : ajout venu d'ailleurs, ou retour après une coupure
  // (mes coches pas encore envoyées restent affichées par-dessus)
  const reload = useRef(async () => {
    try {
      const fresh = await reloadShoppingLines(listId);
      if (!fresh) return;
      setNames(fresh.names);
      setPending(stillRelevant(pendingRef.current, fresh.lines));
      setLines(mergePending(fresh.lines, pendingRef.current, userId));
    } catch {
      // Pas de réseau : on garde ce qu'on a
    }
  });

  // Envoi de la file au retour du réseau. Chaque coche est renvoyée telle quelle :
  // set_line_checked ne fait rien si l'article est déjà coché (aucun risque de doublon).
  const flush = useRef(async () => {
    if (!pendingRef.current.length) return;
    setSyncing(true);
    try {
      for (const check of [...pendingRef.current]) {
        const { ok } = await setLineChecked(check.lineId, true);
        // ok, ou ligne retirée de la liste entre-temps : la coche quitte la file
        if (ok || !linesRef.current.some((l) => l.id === check.lineId)) {
          setPending(pendingRef.current.filter((p) => p.lineId !== check.lineId));
        }
      }
    } catch {
      // Le réseau est retombé : on réessaiera au prochain retour
    } finally {
      setSyncing(false);
    }
    await reload.current();
  });

  // Au chargement : file d'attente gardée sur le téléphone ; hors ligne, la dernière
  // version de la liste gardée (plus récente que la page servie par le cache)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [queue, saved] = await Promise.all([loadQueue(listId), loadSavedList(listId)]);
      if (cancelled) return;
      pendingRef.current = queue;
      setPendingState(queue);
      const base = !navigator.onLine && saved ? saved.lines : linesRef.current;
      if (!navigator.onLine && saved) setNames({ ...saved.names, ...namesRef.current });
      setLines(mergePending(base, queue, userId));
      if (navigator.onLine && queue.length) void flush.current();
    })();
    return () => {
      cancelled = true;
    };
  }, [listId, userId, setLines]);

  // Retour du réseau : envoi de la file, puis relecture
  useEffect(() => {
    const onOnline = () => void flush.current();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // En ligne : demande au service worker de garder cette page (et l'accueil) pour le hors ligne
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "pages-gardees" && event.data.kept > 0) setOfflineReady(true);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    void navigator.serviceWorker.ready.then((registration) =>
      registration.active?.postMessage({
        type: "garder-pages",
        urls: ["/", "/courses", `/courses/${listId}`],
      }),
    );
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [listId]);

  // Ouvrir une liste prête la fait passer « en courses » (une seule fois)
  useEffect(() => {
    if (props.status === "ready") startShopping(listId).catch(() => {});
  }, [listId, props.status]);

  useEffect(() => {
    const supabase = createClient();
    let subscribedOnce = false;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      // La session (cookies) est lue AVANT de s'abonner, et transmise au temps réel :
      // sans elle, l'abonnement se ferait en « anonyme » et les règles RLS filtreraient
      // tous les changements, sans aucun message d'erreur.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);

      channel = supabase
        .channel(`courses:${listId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "shopping_list_items",
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            const change = { eventType: payload.eventType, new: payload.new, old: payload.old };
            // Le contenu reçu correspond aux colonnes de shopping_list_items (cf. LineChange)
            const result = applyChange(linesRef.current, change as unknown as LineChange);
            setLines(result.lines);
            // Coche d'une personne dont on ne connaît pas encore le nom : on relit aussi
            const checker = (payload.new as { checked_by?: string | null })?.checked_by;
            const unknownChecker = checker && checker !== userId && !namesRef.current[checker];
            if (result.needsReload || unknownChecker) void reload.current();
          },
        )
        // Fin des courses sur un autre téléphone : la liste passe à « terminée »
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "shopping_lists", filter: `id=eq.${listId}` },
          (payload) => {
            if ((payload.new as { status?: string }).status === "done") setFinished(true);
          },
        )
        .subscribe((status) => {
          setLive(status === "SUBSCRIBED");
          if (status !== "SUBSCRIBED") return;
          // Réabonnement après une coupure : des changements ont pu être manqués
          if (subscribedOnce) void reload.current();
          subscribedOnce = true;
        });
    }
    void subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [listId, userId, setLines]);

  /** Hors ligne : la coche rejoint la file (ou en sort, pour une erreur de doigt). */
  function toggleWithoutNetwork(lineId: string) {
    const result = toggleOffline(
      linesRef.current,
      pendingRef.current,
      lineId,
      userId,
      new Date().toISOString(),
    );
    setPending(result.pending);
    setLines(result.lines);
  }

  async function toggle(line: ShoppingLine) {
    setFailed(false);
    if (!navigator.onLine) return toggleWithoutNetwork(line.id);

    const value = !line.checked;
    // Une coche encore en file (faite hors ligne) : la décocher la retire simplement de la file
    if (!value && pendingRef.current.some((p) => p.lineId === line.id)) {
      return toggleWithoutNetwork(line.id);
    }
    setLines(setChecked(linesRef.current, line.id, value, userId));
    try {
      const { ok } = await setLineChecked(line.id, value);
      if (!ok) throw new Error("refus");
    } catch (error) {
      // Coupure pendant l'envoi : une coche passe dans la file ; sinon retour en arrière
      const networkLost =
        !navigator.onLine || !(error instanceof Error && error.message === "refus");
      if (value && networkLost) {
        setPending([
          ...pendingRef.current.filter((p) => p.lineId !== line.id),
          { lineId: line.id, checkedAt: new Date().toISOString() },
        ]);
        return;
      }
      setLines(setChecked(linesRef.current, line.id, !value, userId));
      setFailed(true);
    }
  }

  function add(item: CatalogueItem) {
    startAdding(async () => {
      const ok = await addListLine(listId, item.id, {
        quantity: 1,
        unit: item.purchaseUnit ?? item.defaultUnit,
      }).then(
        (r) => r.ok,
        () => false,
      );
      setFailed(!ok);
      if (ok) {
        await reload.current();
        router.refresh();
      }
    });
  }

  const { checked, total } = progress(lines);
  const groups = shoppingGroups(lines);
  const banner = syncBanner(online, pending.length, syncing);

  return (
    <div
      className="grid gap-6"
      data-realtime={live ? "connecte" : "deconnecte"}
      data-hors-ligne-pret={offlineReady ? "oui" : "non"}
    >
      {/* Progression : reste visible en haut pendant qu'on fait défiler */}
      <div className="bg-background/95 sticky top-0 z-10 -mx-4 grid gap-2 border-b px-4 py-3 backdrop-blur">
        <p className="text-sm font-medium" aria-live="polite">
          {checked === total && total > 0
            ? "Tout est dans le panier !"
            : `${checked} / ${total} article${total > 1 ? "s" : ""} dans le panier`}
        </p>
        <div
          className="bg-muted h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Progression des courses"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={checked}
        >
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: total ? `${(checked / total) * 100}%` : "0%" }}
          />
        </div>
        {banner && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {online ? (
              <RefreshCw className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            <p>
              {banner}
              {!online && (
                <span className="block text-xs">
                  Décocher un article déjà enregistré : en ligne seulement.
                </span>
              )}
            </p>
          </div>
        )}
        {failed && (
          <p role="alert" className="text-destructive text-sm">
            L&apos;enregistrement a échoué. Vérifiez votre connexion et réessayez.
          </p>
        )}
      </div>

      {finished && (
        <div
          role="status"
          className="bg-secondary flex flex-wrap items-center gap-3 rounded-xl p-4 text-sm"
        >
          <Flag className="size-5 shrink-0" aria-hidden="true" />
          <p className="flex-1">Ces courses sont terminées.</p>
          <Button asChild size="sm">
            <Link href={`/listes/${listId}`}>Voir le récapitulatif</Link>
          </Button>
        </div>
      )}

      {lines.length === 0 && (
        <p className="text-muted-foreground py-6 text-center text-sm">La liste est vide.</p>
      )}

      {groups.map((group) => (
        <section key={group.aisle} className="grid gap-2" aria-label={group.aisle}>
          <AisleHeading
            aisle={group.aisle}
            suffix={group.remaining === 0 ? " · fini" : undefined}
          />
          <ul className="divide-border bg-card divide-y rounded-xl border">
            {group.lines.map((line) => {
              const checkedBy =
                line.checked && line.checkedBy && line.checkedBy !== userId
                  ? (names[line.checkedBy] ?? "quelqu'un")
                  : null;
              return (
                <li key={line.id}>
                  {/* Toute la ligne est cliquable : grande cible, utilisable d'une main */}
                  <label className="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-3 select-none">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={line.checked}
                      // Hors ligne, une coche déjà enregistrée ne se décoche pas (coché gagne)
                      disabled={finished || !canToggle(line, online, pending)}
                      onChange={() => void toggle(line)}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        "peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]",
                        line.checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {line.checked && <Check className="size-5" strokeWidth={3} />}
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span
                        data-item-name
                        className={cn(
                          "font-medium",
                          line.checked && "text-muted-foreground line-through",
                        )}
                      >
                        {line.name}
                      </span>
                      {checkedBy && (
                        <span className="text-muted-foreground text-xs">coché par {checkedBy}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm tabular-nums",
                        line.checked ? "text-muted-foreground" : "font-medium",
                      )}
                    >
                      {formatQuantity(line.quantity, line.unit)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className={cn("grid gap-2", finished && "hidden")}>
        <p className="text-sm font-medium">Un oubli ?</p>
        {online ? (
          <ItemCombobox
            items={items}
            selectedId={null}
            selectedName=""
            placeholder={adding ? "Ajout…" : "Ajouter un article…"}
            onSelect={add}
            onCreate={setNewItemName}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            Ajouter un article : possible au retour du réseau.
          </p>
        )}
      </div>

      {!finished && (
        <FinishShopping
          listId={listId}
          uncheckedNames={lines.filter((l) => !l.checked).map((l) => l.name)}
          ownerName={props.ownerName}
          blockedReason={
            !online
              ? "Terminer : possible au retour du réseau."
              : pending.length || syncing
                ? "Envoi des coches en cours…"
                : null
          }
        />
      )}

      <NewItemDialog
        key={newItemName ?? "closed"}
        open={newItemName !== null}
        initialName={newItemName ?? ""}
        aisles={props.aisles}
        onOpenChange={(open) => !open && setNewItemName(null)}
        onCreated={(item) => {
          setItems((list) => [...list, item].sort((a, b) => a.name.localeCompare(b.name, "fr")));
          setNewItemName(null);
          add(item);
        }}
      />
    </div>
  );
}

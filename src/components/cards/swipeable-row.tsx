"use client";

import { Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

const ACTION_WIDTH = 80; // largeur d'un bouton révélé
// Le fond coloré démarre un peu SOUS la carte : ainsi ses coins arrondis se détachent
// sur la couleur, sans laisser apparaître de blanc à la jonction.
const UNDERLAP = 16;
const DIRECTION_THRESHOLD = 8; // px avant de décider : glissement horizontal ou défilement ?

// Le bleu passe au-dessus du rouge, coins droits arrondis : même jonction
// que la carte au-dessus du bleu (« relative » le place devant le rouge)
const primaryClass =
  "bg-primary text-primary-foreground relative flex flex-col items-center justify-center gap-1 rounded-r-xl text-sm";
const primaryStyle = { width: ACTION_WIDTH + UNDERLAP, paddingLeft: UNDERLAP };

/**
 * Ligne qu'on fait glisser vers la gauche (au doigt) pour révéler ses actions :
 * une action principale en bleu, facultative (« Modifier » pour une recette, « Dupliquer »
 * pour un menu…), et une action rouge (« Supprimer », « Renoncer »…), comme les emails
 * dans Outlook.
 *
 * Principe :
 * - au début du geste, on attend quelques pixels pour savoir si le doigt va
 *   plutôt à l'horizontale (glissement) ou à la verticale (défilement de la page) ;
 * - pendant le glissement, la carte suit le doigt (transform: translateX) ;
 * - au lâcher, elle s'ouvre si on a dépassé la moitié, sinon elle se referme.
 * Seuls les gestes au doigt sont pris en compte : la souris n'est pas concernée.
 */
export function SwipeableRow({
  primary,
  onDelete,
  deleteLabel = "Supprimer",
  children,
}: {
  /** Action bleue (facultative) : un lien (href) ou un bouton (onClick). */
  primary?: { label: string; Icon: LucideIcon; href?: string; onClick?: () => void };
  /** Libellé de l'action rouge. */
  deleteLabel?: string;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0); // décalage actuel, de 0 à -160 px
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{
    startX: number;
    startY: number;
    startOffset: number;
    direction: "undecided" | "horizontal" | "vertical";
    moved: boolean;
  } | null>(null);
  // Un ou deux boutons révélés ; au-delà de la moitié, la ligne reste ouverte
  const ACTIONS_WIDTH = primary ? 2 * ACTION_WIDTH : ACTION_WIDTH;
  const OPEN_THRESHOLD = ACTIONS_WIDTH / 2;
  const isOpen = offset <= -ACTIONS_WIDTH;

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "touch") return;
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: offset,
      direction: "undecided",
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.direction === "undecided") {
      if (Math.abs(dx) < DIRECTION_THRESHOLD && Math.abs(dy) < DIRECTION_THRESHOLD) return;
      g.direction = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (g.direction === "horizontal") {
        // On « capture » le doigt : la suite du geste nous revient même s'il sort de la carte
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (g.direction !== "horizontal") return;

    g.moved = true;
    setOffset(Math.min(0, Math.max(-ACTIONS_WIDTH, g.startOffset + dx)));
  }

  function onPointerEnd() {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (g?.direction === "horizontal") {
      setOffset((current) => (current < -OPEN_THRESHOLD ? -ACTIONS_WIDTH : 0));
      if (g.moved) suppressNextClick.current = true;
    }
  }

  // Après un glissement, le « clic » de fin de geste ne doit pas ouvrir la carte
  const suppressNextClick = useRef(false);
  function onClickCapture(e: React.MouseEvent) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    } else if (isOpen) {
      // Toucher la carte ouverte la referme simplement
      e.preventDefault();
      e.stopPropagation();
      setOffset(0);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Boutons révélés derrière la carte */}
      {/* Masqués tant que la carte n'a pas bougé : sinon ils dépassent aux coins arrondis */}
      <div
        className={cn("absolute inset-y-0 right-0 flex", offset === 0 && "invisible")}
        style={{ width: ACTIONS_WIDTH + UNDERLAP }}
        aria-hidden={!isOpen}
      >
        {primary?.href ? (
          <Link
            href={primary.href}
            tabIndex={isOpen ? 0 : -1}
            className={primaryClass}
            style={primaryStyle}
          >
            <primary.Icon className="size-5" />
            {primary.label}
          </Link>
        ) : primary ? (
          <button
            type="button"
            tabIndex={isOpen ? 0 : -1}
            onClick={() => {
              setOffset(0);
              primary.onClick?.();
            }}
            className={primaryClass}
            style={primaryStyle}
          >
            <primary.Icon className="size-5" />
            {primary.label}
          </button>
        ) : null}
        <button
          type="button"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => {
            setOffset(0);
            onDelete();
          }}
          // Avec un bleu : le rouge glisse dessous (marge négative) et remplit le creux des
          // coins. Seul : il démarre sous la carte, comme le bleu.
          className="bg-destructive flex flex-col items-center justify-center gap-1 text-sm text-white"
          style={{
            width: ACTION_WIDTH + UNDERLAP,
            marginLeft: primary ? -UNDERLAP : 0,
            paddingLeft: UNDERLAP,
          }}
        >
          <Trash2 className="size-5" />
          {deleteLabel}
        </button>
      </div>

      {/* La carte, qui suit le doigt. Pas de fond ici : seuls les coins arrondis de la
          carte sont visibles, et le bleu apparaît dans les creux (comme Outlook). */}
      <div
        className={cn("relative touch-pan-y", !dragging && "transition-transform")}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
}

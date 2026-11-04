import { describe, expect, it } from "vitest";

import {
  canToggle,
  mergePending,
  type PendingCheck,
  stillRelevant,
  syncBanner,
  toggleOffline,
} from "@/lib/offline-queue";
import type { ShoppingLine } from "@/lib/shopping-lines";

const line = (patch: Partial<ShoppingLine>): ShoppingLine => ({
  id: "l1",
  itemId: "i1",
  name: "Pomme",
  aisleName: "Fruits et légumes",
  aislePosition: 1,
  quantity: 4,
  unit: "piece",
  recipeTitles: [],
  checked: false,
  checkedBy: null,
  checkedAt: null,
  ...patch,
});
const NOW = "2026-11-04T10:00:00.000Z";

describe("canToggle", () => {
  it("en ligne : tout est possible", () => {
    expect(canToggle(line({ checked: true }), true, [])).toBe(true);
  });

  it("hors ligne : cocher oui, décocher une coche déjà envoyée non (coché gagne)", () => {
    expect(canToggle(line({}), false, [])).toBe(true);
    expect(canToggle(line({ checked: true }), false, [])).toBe(false);
  });

  it("hors ligne : décocher une coche faite hors ligne, oui (erreur de doigt)", () => {
    expect(canToggle(line({ checked: true }), false, [{ lineId: "l1", checkedAt: NOW }])).toBe(
      true,
    );
  });
});

describe("toggleOffline", () => {
  it("coche et ajoute à la file", () => {
    const result = toggleOffline([line({})], [], "l1", "moi", NOW);
    expect(result.lines[0]).toMatchObject({ checked: true, checkedBy: "moi", checkedAt: NOW });
    expect(result.pending).toEqual([{ lineId: "l1", checkedAt: NOW }]);
  });

  it("décoche une coche faite hors ligne et la retire de la file", () => {
    const first = toggleOffline([line({})], [], "l1", "moi", NOW);
    const second = toggleOffline(first.lines, first.pending, "l1", "moi", NOW);
    expect(second.lines[0].checked).toBe(false);
    expect(second.pending).toEqual([]);
  });

  it("refuse de décocher une coche connue du serveur", () => {
    const lines = [line({ checked: true, checkedBy: "elle", checkedAt: "t" })];
    expect(toggleOffline(lines, [], "l1", "moi", NOW)).toEqual({ lines, pending: [] });
  });
});

describe("mergePending", () => {
  const pending: PendingCheck[] = [{ lineId: "l1", checkedAt: NOW }];

  it("garde affichées mes coches pas encore envoyées", () => {
    expect(mergePending([line({})], pending, "moi")[0]).toMatchObject({
      checked: true,
      checkedBy: "moi",
    });
  });

  it("laisse la coche du serveur si l'article est déjà coché (par l'autre personne)", () => {
    const server = [line({ checked: true, checkedBy: "elle", checkedAt: "t" })];
    expect(mergePending(server, pending, "moi")[0].checkedBy).toBe("elle");
  });
});

describe("stillRelevant", () => {
  it("oublie les coches d'articles retirés de la liste entre-temps", () => {
    const pending = [
      { lineId: "l1", checkedAt: NOW },
      { lineId: "retiree", checkedAt: NOW },
    ];
    expect(stillRelevant(pending, [line({})])).toEqual([{ lineId: "l1", checkedAt: NOW }]);
  });
});

describe("syncBanner", () => {
  it("annonce le mode hors ligne et les coches en attente", () => {
    expect(syncBanner(false, 0, false)).toBe("Hors ligne — vous pouvez continuer à cocher");
    expect(syncBanner(false, 1, false)).toBe(
      "Hors ligne — 1 coche sera envoyée au retour du réseau",
    );
    expect(syncBanner(false, 3, false)).toBe(
      "Hors ligne — 3 coches seront envoyées au retour du réseau",
    );
  });

  it("en ligne : envoi en cours, puis plus rien", () => {
    expect(syncBanner(true, 2, true)).toBe("Envoi de 2 coches…");
    expect(syncBanner(true, 0, false)).toBeNull();
  });
});

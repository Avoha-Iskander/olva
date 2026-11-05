import { describe, expect, it } from "vitest";
import { buildMatcher, resolveItem, singularize } from "@/lib/ai/match-ingredients";

const items = [
  { id: "oignon", name: "Oignon" },
  { id: "tomate-cerise", name: "Tomate cerise" },
  { id: "creme", name: "Crème fraîche épaisse" },
  { id: "oeuf", name: "Œuf" },
  { id: "sauce-perso", name: "Sauce tomate", isPersonal: true },
  { id: "sauce-commune", name: "Sauce tomate" },
];
const aliases = [
  { alias: "oignons jaunes", itemId: "oignon" },
  { alias: "creme fraiche", itemId: "creme" },
];
const match = buildMatcher(items, aliases);

describe("buildMatcher", () => {
  it("retrouve un article par son nom, sans majuscules ni accents", () => {
    expect(match("oignon")).toBe("oignon");
    expect(match("OEUF")).toBe("oeuf");
  });

  it("accepte le pluriel", () => {
    expect(match("Tomates cerises")).toBe("tomate-cerise");
    expect(match("Œufs")).toBe("oeuf");
  });

  it("utilise les synonymes", () => {
    expect(match("Oignons jaunes")).toBe("oignon");
    expect(match("Crème fraîche")).toBe("creme");
  });

  it("préfère mon article personnel à celui du catalogue", () => {
    expect(match("sauce tomate")).toBe("sauce-perso");
  });

  it("ne devine pas : un nom inconnu reste non reconnu", () => {
    expect(match("Piment d'Espelette")).toBeNull();
    expect(match("tomate")).toBeNull(); // « Tomate cerise » n'est pas « Tomate »
  });
});

describe("buildMatcher : les accents comptent", () => {
  const match = buildMatcher(
    [
      { id: "pate", name: "Pâté" },
      { id: "pate-brisee", name: "Pâte brisée" },
      { id: "echalote", name: "Échalote" },
      { id: "creme", name: "Crème fraîche" },
    ],
    [{ alias: "creme liquide", itemId: "creme" }],
  );

  it("« pâtes » n'est pas « Pâté » (accents différents)", () => {
    expect(match("pâtes")).toBeNull();
    expect(match("Pâtes")).toBeNull();
    expect(match("pâte")).toBeNull(); // la pâte à tarte non plus
  });

  it("retrouve toujours « Pâté » et « Pâte brisée » écrits correctement", () => {
    expect(match("pâté")).toBe("pate");
    expect(match("Pâtes brisées")).toBe("pate-brisee");
  });

  it("tolère un mot écrit sans aucun accent", () => {
    expect(match("echalote")).toBe("echalote");
    expect(match("echalotes")).toBe("echalote");
    expect(match("creme fraiche")).toBe("creme");
  });

  it("tolère un synonyme écrit sans accents", () => {
    expect(match("Crème liquide")).toBe("creme");
  });
});

describe("singularize", () => {
  it("retire le pluriel de chaque mot, pas des mots courts", () => {
    expect(singularize("pommes de terre")).toBe("pomme de terre");
    expect(singularize("noix")).toBe("noix");
    expect(singularize("gros")).toBe("gros");
    expect(singularize("poireaux")).toBe("poireau");
    expect(singularize("choux")).toBe("chou");
    expect(singularize("ananas")).toBe("anana"); // limite connue : rattrapée par le nom exact
  });
});

describe("resolveItem : mes synonymes", () => {
  const items = [
    { id: "huile-olive", name: "Huile d'olive" },
    { id: "huile-tournesol", name: "Huile de tournesol" },
  ];
  const match = buildMatcher(items);
  const mine = buildMatcher([], [{ alias: "huile", itemId: "huile-tournesol" }]);

  it("mon choix passé l'emporte sur celui de Claude, sans mention « proposé »", () => {
    expect(
      resolveItem(
        { name: "Huile", item: "Huile d'olive", item_proposed: true },
        items,
        match,
        mine,
      ),
    ).toEqual({ itemId: "huile-tournesol", proposed: false });
  });

  it("sans synonyme, le choix de Claude reste", () => {
    expect(
      resolveItem({ name: "Huile neutre", item: "Huile d'olive" }, items, match, mine),
    ).toEqual({ itemId: "huile-olive", proposed: false });
  });
});

describe("resolveItem", () => {
  const items = [
    { id: "pate", name: "Pâté" },
    { id: "tomates-concassees", name: "Tomates concassées" },
    { id: "tomate", name: "Tomate" },
    { id: "oignon-grelot", name: "Oignon grelot" },
    { id: "coriandre-perso", name: "Coriandre", isPersonal: true },
    { id: "coriandre", name: "Coriandre" },
  ];
  const match = buildMatcher(items);

  it("retient l'article exact choisi par Claude, avec accents", () => {
    expect(resolveItem({ name: "Tomate", item: "Tomates concassées" }, items, match)).toEqual({
      itemId: "tomates-concassees",
      proposed: false,
    });
  });

  it("garde l'indication « proposé » quand Claude n'était pas sûr", () => {
    expect(
      resolveItem(
        { name: "Petit oignon", item: "Oignon grelot", item_proposed: true },
        items,
        match,
      ),
    ).toEqual({ itemId: "oignon-grelot", proposed: true });
  });

  it("préfère mon article personnel à homonyme", () => {
    expect(resolveItem({ name: "x", item: "Coriandre" }, items, match).itemId).toBe(
      "coriandre-perso",
    );
  });

  it("sans article choisi (ou inconnu), revient au rattachement par le nom lu", () => {
    expect(resolveItem({ name: "Tomates", item: null }, items, match)).toEqual({
      itemId: "tomate",
      proposed: false,
    });
    expect(resolveItem({ name: "Tomate", item: "Article inventé" }, items, match).itemId).toBe(
      "tomate",
    );
  });
});

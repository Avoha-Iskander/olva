import { describe, expect, it } from "vitest";
import { buildMatcher, singularize } from "@/lib/ai/match-ingredients";

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

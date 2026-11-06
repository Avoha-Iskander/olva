import { describe, expect, it } from "vitest";

import { sortByTitle } from "@/lib/recipe-sort";

const titles = (list: { title: string }[]) => list.map((r) => r.title);

describe("sortByTitle", () => {
  it("trie à la française : accents, ligatures et majuscules ne comptent pas", () => {
    const sorted = sortByTitle(
      ["Tarte aux pommes", "œufs mimosa", "Éclair au café", "apple pie", "Crêpes"].map((title) => ({
        title,
      })),
    );
    expect(titles(sorted)).toEqual([
      "apple pie",
      "Crêpes",
      "Éclair au café",
      "œufs mimosa",
      "Tarte aux pommes",
    ]);
  });

  it("lit les nombres comme des nombres", () => {
    expect(titles(sortByTitle([{ title: "10 tartes" }, { title: "2 tartes" }]))).toEqual([
      "2 tartes",
      "10 tartes",
    ]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const list = [{ title: "B" }, { title: "A" }];
    sortByTitle(list);
    expect(titles(list)).toEqual(["B", "A"]);
  });
});

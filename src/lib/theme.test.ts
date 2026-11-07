import { describe, expect, it } from "vitest";

import { isTheme, themeAttribute } from "@/lib/theme";

describe("thème", () => {
  it("Automatique : pas d'attribut, on suit le téléphone", () => {
    expect(themeAttribute("system")).toBeNull();
    expect(themeAttribute("light")).toBe("light");
    expect(themeAttribute("dark")).toBe("dark");
  });

  it("n'accepte que les trois valeurs prévues", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("bleu")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { defaultMenuName } from "./menu-name";

describe("defaultMenuName", () => {
  it("un samedi : le lundi de la même semaine", () => {
    expect(defaultMenuName(new Date("2026-11-07T12:00:00Z"))).toBe("Semaine du 2 novembre");
  });

  it("un lundi : ce lundi-là", () => {
    expect(defaultMenuName(new Date("2026-11-09T08:00:00Z"))).toBe("Semaine du 9 novembre");
  });

  it("un dimanche : le lundi d'avant (la semaine commence le lundi)", () => {
    expect(defaultMenuName(new Date("2026-11-15T20:00:00Z"))).toBe("Semaine du 9 novembre");
  });

  it("dimanche 23 h 30 à Paris (22 h 30 UTC) : encore la semaine finissante", () => {
    expect(defaultMenuName(new Date("2026-11-15T22:30:00Z"))).toBe("Semaine du 9 novembre");
  });

  it("lundi 0 h 30 à Paris (dimanche 23 h 30 UTC) : déjà la nouvelle semaine", () => {
    expect(defaultMenuName(new Date("2026-11-15T23:30:00Z"))).toBe("Semaine du 16 novembre");
  });

  it("à cheval sur deux mois", () => {
    expect(defaultMenuName(new Date("2026-12-03T10:00:00Z"))).toBe("Semaine du 30 novembre");
  });
});

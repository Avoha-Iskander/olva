import { describe, expect, it } from "vitest";
import { listTitle } from "@/lib/list-title";

describe("listTitle", () => {
  it("date la liste à l'heure de Paris", () => {
    expect(listTitle("2026-11-02T10:00:00Z")).toBe("Liste du lundi 2 novembre");
  });

  it("une liste créée à 23 h 30 (heure de Paris) garde la bonne date", () => {
    // 22 h 30 UTC le 2 novembre = 23 h 30 à Paris : toujours le 2
    expect(listTitle("2026-11-02T22:30:00Z")).toBe("Liste du lundi 2 novembre");
  });
});

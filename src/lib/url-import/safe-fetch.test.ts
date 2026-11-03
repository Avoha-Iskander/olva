import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Faux DNS : on choisit l'adresse IP à laquelle chaque nom « mène »
const lookup = vi.fn();
vi.mock("node:dns/promises", () => ({ lookup }));

const { isPrivateAddress, parsePublicUrl, safeFetch } = await import("@/lib/url-import/safe-fetch");

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // métadonnées d'hébergeur cloud
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:10.0.0.1",
    "pas-une-ip",
  ])("refuse %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(["93.184.216.34", "172.32.0.1", "8.8.8.8", "2606:4700::1111"])("accepte %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("parsePublicUrl", () => {
  it("accepte une page de recette ordinaire", () => {
    expect(parsePublicUrl(" https://www.marmiton.org/recettes/tarte.aspx ")?.hostname).toBe(
      "www.marmiton.org",
    );
  });

  it.each([
    "pas une adresse",
    "ftp://exemple.fr/recette",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://moi:secret@exemple.fr/",
    "https://exemple.fr:8080/",
    "http://localhost/",
    "http://intranet/",
    "http://imprimante.local/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://192.168.1.1/admin",
  ])("refuse %s", (raw) => {
    expect(parsePublicUrl(raw)).toBeNull();
  });
});

describe("safeFetch", () => {
  const fetchMock = vi.fn();
  const html = (body: string, headers: Record<string, string> = {}) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html", ...headers } });
  const options = {
    accept: (t: string) => t.startsWith("text/html"),
    maxBytes: 1000,
    timeoutMs: 1000,
  };

  beforeEach(() => {
    lookup.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lit une page publique", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(html("<h1>Tarte</h1>"));
    const result = await safeFetch("https://exemple.fr/tarte", options);
    expect(result.ok && new TextDecoder().decode(result.body)).toBe("<h1>Tarte</h1>");
  });

  it("refuse un nom de domaine qui mène à une adresse privée", async () => {
    lookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    const result = await safeFetch("https://piege.exemple.fr/", options);
    expect(result).toEqual({ ok: false, reason: "blocked" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une redirection vers une adresse privée", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }),
    );
    const result = await safeFetch("https://exemple.fr/", options);
    expect(result).toEqual({ ok: false, reason: "blocked" });
  });

  it("refuse une page trop lourde", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(html("x".repeat(2000)));
    expect(await safeFetch("https://exemple.fr/", options)).toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("refuse un type de contenu inattendu", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(html("{}", { "content-type": "application/pdf" }));
    expect(await safeFetch("https://exemple.fr/", options)).toEqual({ ok: false, reason: "type" });
  });

  it("signale une page en erreur (ex. site qui bloque)", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockResolvedValue(new Response("Interdit", { status: 403 }));
    expect(await safeFetch("https://exemple.fr/", options)).toEqual({ ok: false, reason: "http" });
  });
});

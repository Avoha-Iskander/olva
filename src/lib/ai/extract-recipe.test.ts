import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fausse API Anthropic : on contrôle la réponse de « Claude » dans chaque test
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 529;
  }
  class Anthropic {
    static APIError = APIError;
    messages = { create };
  }
  return { default: Anthropic };
});

const { extractRecipeFromImages } = await import("@/lib/ai/extract-recipe");

const page = (data: string, mediaType: "image/webp" | "image/jpeg" = "image/jpeg") => ({
  data,
  mediaType,
});

const toolAnswer = (input: unknown) => ({
  content: [{ type: "tool_use", id: "t1", name: "extract_recipe", input }],
});

describe("extractRecipeFromImages", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "cle-de-test";
    create.mockReset();
  });
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("renvoie la recette lue", async () => {
    create.mockResolvedValue(
      toolAnswer({
        is_recipe: true,
        title: "Crêpes",
        servings: 4,
        ingredients: [{ name: "Farine", quantity: 250, unit: "g" }],
        steps: ["Mélanger."],
      }),
    );
    const result = await extractRecipeFromImages(
      [page("aGVsbG8=", "image/webp")],
      "claude-haiku-5-5",
    );
    expect(result).toMatchObject({ status: "done", recipe: { title: "Crêpes", servings: 4 } });
  });

  it("force la réponse structurée et envoie la photo", async () => {
    create.mockResolvedValue(toolAnswer({ is_recipe: true, title: "Crêpes" }));
    await extractRecipeFromImages([page("aGVsbG8=", "image/webp")], "claude-sonnet-5-5");
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("claude-sonnet-5-5");
    expect(request.tool_choice).toEqual({ type: "tool", name: "extract_recipe" });
    expect(request.messages[0].content[1]).toMatchObject({
      type: "image",
      source: { type: "base64", media_type: "image/webp", data: "aGVsbG8=" },
    });
  });

  it("signale une photo qui n'est pas une recette", async () => {
    create.mockResolvedValue(toolAnswer({ is_recipe: false, reason: "Une photo de chat." }));
    const result = await extractRecipeFromImages([page("x", "image/jpeg")], "claude-haiku-5-5");
    expect(result).toEqual({ status: "not_recipe", reason: "Une photo de chat." });
  });

  it("refuse une réponse au mauvais format (on pourra réessayer)", async () => {
    create.mockResolvedValue(
      toolAnswer({ is_recipe: true, ingredients: [{ name: "Lait", quantity: 1, unit: "tasse" }] }),
    );
    const result = await extractRecipeFromImages([page("x", "image/jpeg")], "claude-haiku-5-5");
    expect(result).toMatchObject({ status: "failed", retryable: true });
  });

  it("gère une IA indisponible", async () => {
    create.mockRejectedValue(new Error("surcharge"));
    const result = await extractRecipeFromImages([page("x", "image/jpeg")], "claude-haiku-5-5");
    expect(result).toMatchObject({ status: "failed", retryable: true });
  });

  it("n'appelle pas l'API sans clé", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await extractRecipeFromImages([page("x", "image/jpeg")], "claude-haiku-5-5");
    expect(result).toMatchObject({ status: "failed", retryable: false });
    expect(create).not.toHaveBeenCalled();
  });

  it("envoie plusieurs pages dans l'ordre, en une seule demande", async () => {
    create.mockResolvedValue(toolAnswer({ is_recipe: true, title: "Tarte" }));
    await extractRecipeFromImages([page("p1"), page("p2"), page("p3")], "claude-haiku-5-5");
    expect(create).toHaveBeenCalledTimes(1);
    const images = create.mock.calls[0][0].messages[0].content.filter(
      (block: { type: string }) => block.type === "image",
    );
    expect(images.map((i: { source: { data: string } }) => i.source.data)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });

  it("refuse plus de 3 pages sans appeler l'API", async () => {
    const pages = ["a", "b", "c", "d"].map((d) => page(d));
    const result = await extractRecipeFromImages(pages, "claude-haiku-5-5");
    expect(result).toMatchObject({ status: "failed", retryable: false });
    expect(create).not.toHaveBeenCalled();
  });
});

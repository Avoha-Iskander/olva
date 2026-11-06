/**
 * Lecture d'une page web de recette (US-REC-07). Fonctions pures, sans réseau : testables.
 *
 * La plupart des sites de recettes cachent dans leur page une fiche au format standard
 * schema.org « Recipe » (balise <script type="application/ld+json">), destinée aux moteurs
 * de recherche : titre, portions, ingrédients, étapes, photo. On la lit en priorité.
 * Sinon, on garde le texte visible de la page, nettoyé et raccourci.
 */

/** Recette telle que décrite par la fiche schema.org de la page. */
export type JsonLdRecipe = {
  title: string | null;
  servings: string | null; // texte libre : « 4 », « 4 personnes », « 6 parts »
  ingredients: string[]; // texte libre : « 200 g de farine tamisée »
  steps: string[];
  imageUrl: string | null;
};

/** Ce qu'on retient d'une page, prêt à être envoyé à l'IA. */
export type RecipePage = {
  recipe: JsonLdRecipe | null;
  title: string | null; // balise <title>
  imageUrl: string | null; // fiche schema.org, sinon image de partage (og:image)
  text: string; // texte visible, utilisé si la fiche manque
  // Description de partage (og:description) : chez Instagram, la légende de la publication
  description: string | null;
};

/** Contenu d'une balise <meta> (property="og:…" ou name="…"), dans un ordre ou dans l'autre. */
function metaContent(html: string, key: string): string | null {
  const match =
    html.match(
      new RegExp(
        `<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*content\\s*=\\s*"([^"]*)"`,
        "i",
      ),
    ) ??
    html.match(
      new RegExp(
        `<meta[^>]+content\\s*=\\s*"([^"]*)"[^>]*(?:property|name)\\s*=\\s*["']${key}["']`,
        "i",
      ),
    );
  const text = match ? decodeEntities(match[1]).trim() : "";
  return text || null;
}

const MAX_TEXT = 20_000; // caractères de texte envoyés à l'IA, au plus

/** « &amp; » → « & », « &#233; » → « é »… (entités HTML les plus courantes). */
export function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    rsquo: "’",
    lsquo: "‘",
    hellip: "…",
    deg: "°",
    oelig: "œ",
    eacute: "é",
    egrave: "è",
    ecirc: "ê",
    agrave: "à",
    ccedil: "ç",
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

/** Retire les balises et les espaces en trop d'un petit texte. */
function clean(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return decodeEntities(String(value).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];

/** Vrai si l'objet est de type « Recipe » (le type peut être une liste). */
function isRecipe(node: JsonObject): boolean {
  return asArray(node["@type"]).some((t) => typeof t === "string" && /(^|\/)Recipe$/.test(t));
}

/** Parcourt les données (listes, « @graph », objets imbriqués) à la recherche d'une recette. */
function findRecipeNode(data: unknown, depth = 0): JsonObject | null {
  if (depth > 6) return null;
  for (const node of asArray(data)) {
    if (!isObject(node)) continue;
    if (isRecipe(node)) return node;
    for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement"]) {
      const found = findRecipeNode(node[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Étapes : texte, liste de textes, HowToStep { text }, ou sections HowToSection. */
function readSteps(value: unknown): string[] {
  if (typeof value === "string") {
    // Une seule chaîne : on découpe sur les retours à la ligne s'il y en a
    return value
      .split(/\n+|<br\s*\/?>|<\/p>/i)
      .map(clean)
      .filter(Boolean);
  }
  return asArray(value).flatMap((step) => {
    if (typeof step === "string") return [clean(step)].filter(Boolean);
    if (!isObject(step)) return [];
    if (step.itemListElement) return readSteps(step.itemListElement); // section
    return [clean(step.text ?? step.name)].filter(Boolean);
  });
}

/** Image : adresse, liste d'adresses, ou objet ImageObject { url }. */
function readImage(value: unknown): string | null {
  for (const image of asArray(value)) {
    if (typeof image === "string" && /^https?:\/\//.test(image)) return image;
    if (isObject(image) && typeof image.url === "string" && /^https?:\/\//.test(image.url)) {
      return image.url;
    }
  }
  return null;
}

/** Cherche la fiche schema.org « Recipe » dans le code HTML d'une page. */
export function findJsonLdRecipe(html: string): JsonLdRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, content] of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(content.trim());
    } catch {
      continue; // fiche mal formée : on essaie la suivante
    }
    const node = findRecipeNode(data);
    if (!node) continue;
    const servings = asArray(node.recipeYield).map(clean).filter(Boolean);
    return {
      title: clean(node.name) || null,
      servings: servings[0] ?? null,
      ingredients: asArray(node.recipeIngredient ?? node.ingredients)
        .map(clean)
        .filter(Boolean),
      steps: readSteps(node.recipeInstructions),
      imageUrl: readImage(node.image),
    };
  }
  return null;
}

/** Texte visible d'une page : sans scripts, styles, menus ni pied de page. */
export function visibleText(html: string): string {
  const text = html
    .replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|p|div|li|h[1-6]|tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_TEXT);
}

/** Lit une page : fiche schema.org, titre, image et texte visible. */
export function readRecipePage(html: string, pageUrl: string): RecipePage {
  const recipe = findJsonLdRecipe(html);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogImage =
    html.match(/<meta[^>]+property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i);
  let imageUrl = recipe?.imageUrl ?? (ogImage ? decodeEntities(ogImage[1]) : null);
  // Une image donnée en adresse relative (« /img/tarte.jpg ») est complétée
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, pageUrl).toString();
    } catch {
      imageUrl = null;
    }
  }
  return {
    recipe,
    title: title ? clean(title[1]) || null : null,
    imageUrl,
    text: visibleText(html),
    description: metaContent(html, "og:description") ?? metaContent(html, "description"),
  };
}

/** Vrai s'il y a de quoi lire une recette (fiche, ou assez de texte). */
export function hasReadableContent(page: RecipePage): boolean {
  const length = page.text.length + (page.description?.length ?? 0);
  return Boolean(page.recipe?.ingredients.length) || length >= 200;
}

/**
 * Texte envoyé à l'IA : la fiche schema.org bien rangée si elle existe (fiable et court),
 * sinon le texte visible de la page.
 */
export function pageToPromptText(page: RecipePage): string {
  const r = page.recipe;
  if (r && r.ingredients.length) {
    return [
      "Fiche recette de la page (format schema.org) :",
      `Titre : ${r.title ?? page.title ?? "(absent)"}`,
      `Portions : ${r.servings ?? "(non indiqué)"}`,
      "Ingrédients :",
      ...r.ingredients.map((i) => `- ${i}`),
      "Étapes :",
      ...(r.steps.length
        ? r.steps.map((s, n) => `${n + 1}. ${s}`)
        : // Fiche sans étapes : elles sont sans doute dans le texte de la page
          [
            "(absentes de la fiche, cherche-les dans le texte ci-dessous)",
            "",
            page.text.slice(0, 8000),
          ]),
    ].join("\n");
  }
  return [
    `Titre de la page : ${page.title ?? "(absent)"}`,
    // Publication de réseau social : la recette est souvent dans cette description
    ...(page.description ? ["Description de la page :", page.description, ""] : []),
    "Texte de la page :",
    page.text,
  ].join("\n");
}

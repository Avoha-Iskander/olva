/**
 * Titre d'une liste : son nom s'il a été choisi (US-LST-11), sinon sa date,
 * « Liste du lundi 2 novembre ».
 * Fichier sans « use client » : utilisable par les pages serveur ET les composants client.
 */
export function listTitle(createdAt: string, name?: string | null) {
  if (name) return name;
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris", // même date côté serveur et navigateur
  });
  return `Liste du ${date}`;
}

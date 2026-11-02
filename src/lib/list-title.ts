/**
 * « Liste du lundi 2 novembre » : une liste n'a pas de nom, on la date.
 * Fichier sans « use client » : utilisable par les pages serveur ET les composants client.
 */
export function listTitle(createdAt: string) {
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris", // même date côté serveur et navigateur
  });
  return `Liste du ${date}`;
}

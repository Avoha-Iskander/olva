/**
 * Photos des recettes d'exemple (US-CPT-02, décision 075).
 *
 * Elles sont communes à tous les comptes et rangées dans l'app elle-même
 * (dossier `public/exemples/`), pas dans l'espace de stockage de chaque utilisateur.
 * En base, leur chemin commence par « exemples/ » : on l'affiche directement, sans
 * lien temporaire, et on ne cherche jamais à le supprimer ni à le recopier.
 * Fonctions pures, testées.
 */
export const EXAMPLE_PHOTO_PREFIX = "exemples/";

export function isExamplePhoto(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith(EXAMPLE_PHOTO_PREFIX) && !path.includes("..");
}

/** Adresse d'une photo d'exemple, servie par l'app (« exemples/x.webp » → « /exemples/x.webp »). */
export function examplePhotoUrl(path: string): string {
  return `/${path}`;
}

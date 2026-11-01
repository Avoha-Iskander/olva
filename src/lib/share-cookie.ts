/**
 * Un lien de partage ouvert par quelqu'un qui n'est pas connecté est mémorisé
 * dans ce cookie. À la fin du parcours d'accueil (nouvel inscrit), on le ramène
 * sur la page du lien pour qu'il accepte le partage (SPEC US-CPT-02).
 */
export const PENDING_SHARE_COOKIE = "olva_partage";
export const PENDING_SHARE_MAX_AGE = 60 * 60 * 24; // 1 jour

/** Seules les adresses de lien de partage sont acceptées dans ce cookie. */
export function isShareLinkPath(path: string | undefined): path is string {
  return Boolean(path && /^\/partage\/[A-Za-z0-9_-]{1,100}$/.test(path));
}

/**
 * Import par lien : l'adresse est-elle celle d'une IMAGE plutôt que d'une page ?
 * Cas réel : un appui long sur la photo d'une recette, puis « Copier l'adresse de
 * l'image », donne « …journaldesfemmes.fr/…/tarte.jpg ». Fonction pure, testée.
 *
 * On regarde le type annoncé par le site (« image/jpeg »…), puis la fin de l'adresse
 * (sans ses paramètres : « photo.webp?w=800 » est bien une image).
 */
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp|svg)$/i;

export function isImageLink(url: string, contentType: string | undefined): boolean {
  if (contentType && /^\s*image\//i.test(contentType)) return true;
  try {
    return IMAGE_EXTENSION.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

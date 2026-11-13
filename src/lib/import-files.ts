import { detectImageType, type ImageMediaType } from "@/lib/image-type";

/**
 * Fichiers choisis pour un import par photo (US-REC-02) : fonctions pures, testées.
 *
 * Cas réel (Android 10, Chrome) : une capture d'écran peut arriver avec un type
 * MIME VIDE. L'ancien filtre (`type.startsWith("image/")`) l'écartait sans rien dire.
 * On regarde donc aussi les premiers octets du fichier (sa « signature », cf.
 * image-type.ts), puis son extension.
 */

/** Taille maximale d'un fichier dans l'espace de stockage des photos (bucket recipe-photos). */
export const STORED_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Extensions d'images courantes : un fichier sans type mais ainsi nommé est tenté. */
const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
  "avif",
  "bmp",
]);

/** Extension d'un nom de fichier, en minuscules (« Capture.PNG » → « png »), ou "". */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "";
}

export type FileCheck = { ok: true } | { ok: false; reason: string };

/**
 * Ce fichier peut-il être une image ? `head` = ses premiers octets (16 suffisent).
 * Accepté si : son type commence par « image/ », OU ses octets sont ceux d'une image,
 * OU (type vide) son nom finit par une extension d'image. Sinon : la raison, à tracer.
 */
export function checkImportFile(file: { name: string; type: string }, head: Uint8Array): FileCheck {
  if (file.type.startsWith("image/")) return { ok: true };
  if (detectImageType(head)) return { ok: true };
  const extension = extensionOf(file.name);
  if (!file.type && IMAGE_EXTENSIONS.has(extension)) return { ok: true };
  return {
    ok: false,
    reason: `Fichier écarté : type ${file.type ? `« ${file.type} »` : "vide"}, nom ${
      extension ? `.${extension}` : "sans extension"
    }`,
  };
}

/** Message affiché quand des fichiers choisis ne sont pas des images. */
export function rejectedFilesMessage(count: number): string {
  return count === 1
    ? "Ce fichier n'a pas été reconnu comme une image. Choisissez une photo ou une capture d'écran (JPEG ou PNG)."
    : `${count} fichiers n'ont pas été reconnus comme des images. Choisissez des photos ou des captures d'écran (JPEG ou PNG).`;
}

const EXTENSION_BY_TYPE: Record<ImageMediaType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * La compression a échoué : peut-on envoyer le fichier D'ORIGINE à la place ?
 * Seulement si c'est un JPEG, un PNG ou un WebP (les seuls formats acceptés par le
 * stockage et lus par Claude) et s'il ne dépasse pas la taille maximale du stockage.
 */
export function originalUploadPlan(
  head: Uint8Array,
  size: number,
): { ok: true; contentType: ImageMediaType; extension: string } | { ok: false; reason: string } {
  const contentType = detectImageType(head);
  if (!contentType)
    return { ok: false, reason: "format non pris en charge (ni JPEG, ni PNG, ni WebP)" };
  if (size > STORED_PHOTO_MAX_BYTES) {
    const megabytes = (size / 1024 / 1024).toFixed(1).replace(".", ",");
    return { ok: false, reason: `trop lourd (${megabytes} Mo, 5 Mo au plus)` };
  }
  return { ok: true, contentType, extension: EXTENSION_BY_TYPE[contentType] };
}

/** Message d'une erreur quelconque, pour la trace (jamais vide, 300 caractères au plus). */
export function errorText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return (text || "erreur inconnue").slice(0, 300);
}

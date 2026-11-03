/**
 * Reconnaît le format d'une image à ses premiers octets (sa « signature »), et non à
 * son nom de fichier : une étiquette peut mentir, les octets non. Exemple réel :
 * un téléphone qui ne sait pas produire de WebP renvoie un PNG nommé « .webp ».
 */
export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export function detectImageType(bytes: Uint8Array): ImageMediaType | null {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WebP : « RIFF », 4 octets de taille, puis « WEBP »
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

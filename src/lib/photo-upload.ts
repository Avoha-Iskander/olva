"use client";

import imageCompression from "browser-image-compression";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "recipe-photos";

/**
 * Compresse une photo DANS LE NAVIGATEUR puis l'envoie dans mon dossier.
 * Une photo de téléphone (3 à 5 Mo) devient ~200-400 Ko : envoi rapide même en 4G.
 * Produit deux fichiers : la photo (1 600 px) et une miniature (400 px) pour les listes.
 */
export async function compressAndUploadPhoto(file: File, userId: string, recipeId: string) {
  const [photo, thumb] = await Promise.all([
    imageCompression(file, {
      maxWidthOrHeight: 1600,
      fileType: "image/webp",
      initialQuality: 0.8,
      useWebWorker: true,
    }),
    imageCompression(file, {
      maxWidthOrHeight: 400,
      fileType: "image/webp",
      initialQuality: 0.7,
      useWebWorker: true,
    }),
  ]);

  // Un nom unique à chaque envoi : évite qu'une ancienne version reste en cache
  const stamp = Date.now();
  const photoPath = `${userId}/${recipeId}/photo-${stamp}.webp`;
  const thumbPath = `${userId}/${recipeId}/thumb-${stamp}.webp`;

  const supabase = createClient();
  const storage = supabase.storage.from(BUCKET);
  const options = { contentType: "image/webp", upsert: false };
  const [a, b] = await Promise.all([
    storage.upload(photoPath, photo, options),
    storage.upload(thumbPath, thumb, options),
  ]);
  if (a.error || b.error) throw new Error("L'envoi de la photo a échoué.");

  return { photoPath, thumbPath };
}

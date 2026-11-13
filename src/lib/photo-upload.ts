"use client";

import imageCompression from "browser-image-compression";

import { errorText, originalUploadPlan } from "@/lib/import-files";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "recipe-photos";

/**
 * Deux sortes d'échec, pour afficher le bon message (et tracer la bonne cause) :
 * - PhotoPrepareError : la photo n'a pas pu être préparée SUR LE TÉLÉPHONE (compression
 *   impossible, et fichier d'origine inutilisable) ;
 * - PhotoUploadError : l'ENVOI vers le stockage a échoué (connexion, le plus souvent).
 */
export class PhotoPrepareError extends Error {}
export class PhotoUploadError extends Error {}

type Prepared = {
  blob: Blob;
  contentType: string;
  extension: string;
  note: string | null; // compression échouée mais fichier d'origine envoyé : la raison
};

/**
 * Compresse une image DANS LE NAVIGATEUR (en JPEG). Si la compression échoue (certains
 * téléphones Android anciens), on envoie le fichier d'origine à la place, avec son vrai
 * type, quand le stockage peut l'accepter (JPEG, PNG ou WebP de 5 Mo au plus).
 */
async function prepareImage(
  file: File,
  options: { maxWidthOrHeight: number; initialQuality: number },
): Promise<Prepared> {
  try {
    const blob = await imageCompression(file, {
      ...options,
      fileType: "image/jpeg",
      useWebWorker: true,
    });
    return { blob, contentType: "image/jpeg", extension: "jpg", note: null };
  } catch (error) {
    const reason = errorText(error);
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const plan = originalUploadPlan(head, file.size);
    if (!plan.ok) {
      throw new PhotoPrepareError(`Compression : ${reason} ; fichier d'origine ${plan.reason}`);
    }
    return {
      blob: file,
      contentType: plan.contentType,
      extension: plan.extension,
      note: `Compression : ${reason} — fichier d'origine envoyé (${plan.contentType})`,
    };
  }
}

/**
 * Compresse une photo DANS LE NAVIGATEUR puis l'envoie dans mon dossier.
 * Une photo de téléphone (3 à 5 Mo) devient ~200-400 Ko : envoi rapide même en 4G.
 * Produit deux fichiers : la photo (1 600 px) et une miniature (400 px) pour les listes.
 * JPEG : tous les navigateurs savent en produire (certains téléphones ne savent pas faire
 * de WebP et renvoient alors un PNG étiqueté WebP, bien plus lourd).
 * Si la compression échoue, le fichier d'origine sert pour les deux (cf. prepareImage).
 */
export async function compressAndUploadPhoto(file: File, userId: string, recipeId: string) {
  const [photo, thumb] = await Promise.all([
    prepareImage(file, { maxWidthOrHeight: 1600, initialQuality: 0.8 }),
    prepareImage(file, { maxWidthOrHeight: 400, initialQuality: 0.7 }),
  ]);

  // Un nom unique à chaque envoi : évite qu'une ancienne version reste en cache
  const stamp = Date.now();
  const photoPath = `${userId}/${recipeId}/photo-${stamp}.${photo.extension}`;
  const thumbPath = `${userId}/${recipeId}/thumb-${stamp}.${thumb.extension}`;

  const storage = createClient().storage.from(BUCKET);
  const [a, b] = await Promise.all([
    storage.upload(photoPath, photo.blob, { contentType: photo.contentType, upsert: false }),
    storage.upload(thumbPath, thumb.blob, { contentType: thumb.contentType, upsert: false }),
  ]);
  const failure = a.error ?? b.error;
  if (failure) throw new PhotoUploadError(`Envoi : ${errorText(failure)}`);

  return { photoPath, thumbPath };
}

/**
 * Photos d'import (US-REC-02) : chaque page est compressée DANS LE NAVIGATEUR puis
 * envoyée dans mon dossier, dans l'ordre. 1 568 px : la taille au-delà de laquelle
 * Claude réduit lui-même l'image ; qualité un peu plus haute pour les petits caractères.
 * JPEG et non WebP : tous les navigateurs savent en produire (certains téléphones ne
 * savent pas faire de WebP et renvoient alors un PNG, bien plus lourd).
 * Le dossier est celui de la future recette : la photo pourra lui être attachée.
 * Une page dont la compression échoue part telle quelle (cf. prepareImage) : `notes`
 * en garde la raison, pour la trace.
 */
export async function compressAndUploadImportPages(
  files: File[],
  userId: string,
  recipeId: string,
): Promise<{ paths: string[]; notes: string[] }> {
  const pages = await Promise.all(
    files.map((file) => prepareImage(file, { maxWidthOrHeight: 1568, initialQuality: 0.85 })),
  );

  const stamp = Date.now();
  const paths = pages.map(
    (page, index) => `${userId}/${recipeId}/import-${stamp}-${index + 1}.${page.extension}`,
  );

  const storage = createClient().storage.from(BUCKET);
  const results = await Promise.all(
    pages.map((page, index) =>
      storage.upload(paths[index], page.blob, { contentType: page.contentType, upsert: false }),
    ),
  );
  const failure = results.find((r) => r.error)?.error;
  if (failure) throw new PhotoUploadError(`Envoi : ${errorText(failure)}`);

  return {
    paths,
    notes: pages
      .map((page, index) => page.note && `Page ${index + 1} — ${page.note}`)
      .filter((note): note is string => Boolean(note)),
  };
}

import { createHash, randomBytes } from "node:crypto";

/**
 * Liens de partage : le lien contient un « jeton » aléatoire impossible à deviner.
 * La base ne garde que son empreinte SHA-256 (comme un mot de passe) : on peut
 * vérifier un lien, mais pas le reconstituer à partir de la base.
 * node:crypto est intégré à Node : aucune dépendance à ajouter.
 */

/** Empreinte d'un jeton : SHA-256 en hexadécimal (calcul identique à private.hash_token en SQL). */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Nouveau jeton : 32 octets aléatoires, écrits en base64url (lettres, chiffres, - et _). */
export function createShareToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashShareToken(token) };
}

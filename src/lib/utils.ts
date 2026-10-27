import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine des classes Tailwind proprement.
 * - clsx gère les classes conditionnelles : cn("p-2", actif && "bg-primary")
 * - twMerge résout les conflits : cn("p-2", "p-4") → "p-4" (la dernière gagne)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

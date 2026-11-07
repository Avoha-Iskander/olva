"use client";

import { useEffect } from "react";

import { applyTheme } from "@/components/theme/apply-theme";
import type { Theme } from "@/lib/theme";

/**
 * Aligne l'appareil sur le thème du profil (US-CPT-05) : choisi sur un autre téléphone,
 * il s'applique ici à la prochaine ouverture de l'app. N'affiche rien.
 */
export function ThemeSync({ theme }: { theme: Theme }) {
  useEffect(() => applyTheme(theme), [theme]);
  return null;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/** L'entrée est-elle active ? (/recettes reste actif sur /recettes/123) */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barre du haut : logo, menu (sur ordinateur) et Paramètres.
 * usePathname (un « hook » de Next.js) donne l'adresse courante pour surligner l'entrée active.
 */
export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Olva
        </Link>
        <nav aria-label="Menu principal" className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                isActive(pathname, href) && "bg-secondary text-secondary-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/parametres"
          aria-label="Paramètres"
          aria-current={isActive(pathname, "/parametres") ? "page" : undefined}
          className={cn(
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground ml-auto flex size-11 items-center justify-center rounded-md",
            isActive(pathname, "/parametres") && "text-primary",
          )}
        >
          <Settings className="size-5" />
        </Link>
      </div>
    </header>
  );
}

/** Barre du bas, sur mobile uniquement : les 4 entrées sous le pouce. */
export function AppBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu principal"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, shortLabel, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-muted-foreground flex h-16 flex-col items-center justify-center gap-1 text-xs",
                  active && "text-primary font-medium",
                )}
              >
                <Icon className="size-5" />
                {shortLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

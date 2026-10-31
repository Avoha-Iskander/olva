import Link from "next/link";

import { cn } from "@/lib/utils";

/** Pastilles de filtre par collection ; la recherche en cours est conservée. */
export function CollectionFilter({
  collections,
  activeId,
  search,
}: {
  collections: { id: string; name: string }[];
  activeId?: string;
  search?: string;
}) {
  if (collections.length === 0) return null;

  const href = (collectionId?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (collectionId) params.set("collection", collectionId);
    const query = params.toString();
    return query ? `/recettes?${query}` : "/recettes";
  };

  const chip =
    "flex h-9 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors";
  return (
    <nav aria-label="Filtrer par collection" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        <li>
          <Link
            href={href()}
            aria-current={!activeId ? "true" : undefined}
            className={cn(
              chip,
              !activeId ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            Toutes
          </Link>
        </li>
        {collections.map((c) => (
          <li key={c.id}>
            <Link
              href={href(c.id)}
              aria-current={activeId === c.id ? "true" : undefined}
              className={cn(
                chip,
                activeId === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

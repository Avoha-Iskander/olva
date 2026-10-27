// Page d'accueil provisoire (lot 0).
// Le vrai menu à 4 entrées (SPEC §5) arrivera avec les lots suivants.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Olva</h1>
      <p className="max-w-sm text-lg">
        Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.
      </p>
    </main>
  );
}

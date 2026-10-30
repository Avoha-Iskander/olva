// Gabarit commun aux pages de connexion : logo + carte centrée.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <p className="text-3xl font-semibold tracking-tight">Olva</p>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}

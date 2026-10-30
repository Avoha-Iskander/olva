import { cn } from "@/lib/utils";

/** Message général sous un formulaire : erreur (rouge) ou réussite (bleu). */
export function FormMessage({ message, success }: { message?: string; success?: string }) {
  const text = success ?? message;
  if (!text) return null;
  return (
    <p
      role={success ? "status" : "alert"}
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        success ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive",
      )}
    >
      {text}
    </p>
  );
}

/**
 * Nom par défaut d'un menu (US-MEN-01) : « Semaine du 9 novembre », d'après le lundi
 * de la semaine en cours, à l'heure de Paris.
 * Fonction pure : elle ne lit que la date qu'on lui donne (facile à tester).
 */
export function defaultMenuName(now: Date): string {
  // Date du jour à Paris, au format AAAA-MM-JJ (« en-CA » écrit les dates ainsi)
  const parisDay = now.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const day = new Date(`${parisDay}T00:00:00Z`);
  // getUTCDay : 0 = dimanche, 1 = lundi… ; on recule jusqu'au lundi
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - sinceMonday);
  const label = day.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC", // la date est déjà celle de Paris : on ne la décale plus
  });
  return `Semaine du ${label}`;
}

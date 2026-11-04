import { Button } from "@/components/ui/button";

/**
 * « Faire ses courses » depuis la page hors ligne : un formulaire classique fait une vraie
 * navigation (et non une navigation interne de Next.js), pour que le service worker serve
 * la page gardée sur le téléphone.
 */
export function GoShopping() {
  return (
    <form method="get" action="/courses">
      <Button type="submit">Faire ses courses</Button>
    </form>
  );
}

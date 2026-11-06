import { PageTransition } from "@/components/ui/motion/PageTransition";

/**
 * Transition entre les grandes sections du site. Le template racine n'est
 * remonté que lorsque le premier segment de l'URL change (accueil, missions,
 * connexion…) : naviguer dans le tableau de bord ne le rejoue pas.
 */
export default function TemplateRacine({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}

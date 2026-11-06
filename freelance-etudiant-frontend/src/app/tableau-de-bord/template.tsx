import { PageTransition } from "@/components/ui/motion/PageTransition";

/**
 * Transition entre les pages du tableau de bord. Le template est remonté à
 * chaque navigation (contrairement au layout : la Sidebar et la Navbar ne
 * bougent pas), ce qui rejoue un fondu court du contenu.
 */
export default function TemplateTableauDeBord({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}

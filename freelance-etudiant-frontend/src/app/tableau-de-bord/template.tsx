/**
 * Transition entre les pages du tableau de bord. Le template est remonté à
 * chaque navigation (contrairement au layout : la Sidebar et la Navbar ne
 * bougent pas), ce qui rejoue un fondu court du contenu.
 *
 * `h-full min-h-0` conserve la chaîne de hauteurs dont dépend la messagerie
 * (page en pleine hauteur) ; ailleurs, la hauteur reste automatique.
 */
export default function TemplateTableauDeBord({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-entree h-full min-h-0">{children}</div>;
}

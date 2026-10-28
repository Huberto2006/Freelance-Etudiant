/**
 * Layout commun des écrans d'authentification : aucune navbar, aucune
 * sidebar, aucun footer (masqués par NavbarConditionnelle / FooterConditionnel).
 * Le `-mt-16` annule le `pt-16` que le layout racine réserve à la navbar
 * fixe, afin qu'aucun espace vide ne subsiste en haut de page.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative isolate -mt-16 min-h-screen bg-paper">
      {children}
    </div>
  );
}

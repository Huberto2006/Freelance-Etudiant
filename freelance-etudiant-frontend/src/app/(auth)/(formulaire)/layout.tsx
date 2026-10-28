import { BoutonRetour } from "@/components/ui/BoutonRetour";

/**
 * Écrans d'authentification « formulaire seul » (inscription, mot de passe
 * oublié, réinitialisation, vérification e-mail) : colonne étroite avec
 * bouton de retour. La page de connexion, qui a sa propre composition à deux
 * colonnes, reste en dehors de ce groupe (les URL ne changent pas).
 */
export default function FormulaireAuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="mx-auto max-w-md px-5 pt-5">
        <BoutonRetour label="Retour" repli="/" forcer />
      </div>
      {children}
    </>
  );
}

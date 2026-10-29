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
    // -mt-16 : la Navbar est masquée sur ces écrans, on récupère donc
    // l'espace que <main> lui réserve (aucune bande vide en haut).
    <div className="-mt-16">
      <div className="mx-auto max-w-md px-5 pb-4 pt-5">
        <BoutonRetour repli="/" forcer />
      </div>
      {children}
    </div>
  );
}

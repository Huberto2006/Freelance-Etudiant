/**
 * Transition entre les écrans « formulaire » de l'authentification
 * (inscription, mot de passe oublié, réinitialisation, vérification) :
 * fondu court du contenu à chaque navigation, le bouton de retour du
 * layout restant en place.
 */
export default function TemplateFormulaireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-entree">{children}</div>;
}

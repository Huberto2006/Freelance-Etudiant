/**
 * Referentiel des categories et normalisation.
 *
 * La colonne `categorie` (missions et services) est en texte libre. Sans
 * normalisation, "Développement", "developpement" et "Developpement"
 * seraient trois categories distinctes : les filtres (comparaison exacte)
 * et le catalogue perdaient alors des annonces. Toute categorie ecrite ou
 * filtree passe donc par normaliserCategorie().
 */
export const CATEGORIES_CANONIQUES: readonly string[] = [
  'Developpement',
  'Design',
  'Redaction',
  'Traduction',
  'Marketing',
  'Video',
  'Data',
  'Administratif',
  'Multimedia',
  'Autre',
];

/** Cle de comparaison : sans accents, sans casse, sans espaces superflus. */
export function cleCategorie(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Retourne la valeur canonique d'une categorie connue (sans accent, casse
 * du referentiel), sinon le texte nettoye avec une majuscule initiale.
 */
export function normaliserCategorie(valeur: string): string {
  const texte = valeur.replace(/\s+/g, ' ').trim();
  const cle = cleCategorie(texte);

  if (cle === 'developement') return 'Developpement';

  const connue = CATEGORIES_CANONIQUES.find(
    (categorie) => cleCategorie(categorie) === cle,
  );
  if (connue) return connue;

  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

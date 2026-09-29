/**
 * Gestion des dates limites (colonne SQL `date`, sans heure).
 *
 * Probleme corrige : une date limite "2026-09-30" etait lue comme
 * 2026-09-30T00:00:00Z, donc consideree depassee des minuit UTC (03h00 a
 * Madagascar) le jour meme, alors que l'interface annonce "jusqu'au 30".
 * La date limite est desormais INCLUSIVE : elle reste valable jusqu'a la
 * fin du jour calendaire (fuseau Madagascar, UTC+3, sans heure d'ete).
 */
const DECALAGE_MADAGASCAR_MS = 3 * 60 * 60 * 1000;

/** Jour calendaire courant a Madagascar, au format YYYY-MM-DD. */
export function jourCourant(maintenant: Date = new Date()): string {
  return new Date(maintenant.getTime() + DECALAGE_MADAGASCAR_MS)
    .toISOString()
    .slice(0, 10);
}

/** Convertit une valeur de colonne `date` (string ou Date) en YYYY-MM-DD. */
export function versJourIso(valeur: Date | string): string {
  if (typeof valeur === 'string') return valeur.slice(0, 10);
  return valeur.toISOString().slice(0, 10);
}

/** Vrai si le jour de la date limite est strictement passe. */
export function dateLimiteDepassee(
  valeur: Date | string,
  maintenant: Date = new Date(),
): boolean {
  return versJourIso(valeur) < jourCourant(maintenant);
}

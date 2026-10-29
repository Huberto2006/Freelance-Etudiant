/**
 * Statuts possibles d'une demande d'amitié entre étudiants.
 * Une relation refusée n'est pas une amitié : elle n'empêche pas
 * l'envoi d'une nouvelle demande ultérieure.
 */
export enum StatutAmitie {
  EN_ATTENTE = 'en_attente',
  ACCEPTEE = 'acceptee',
  REFUSEE = 'refusee',
}

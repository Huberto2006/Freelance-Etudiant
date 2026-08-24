/**
 * Cycle de vie d'un paiement (RGp1) :
 * en_attente  -> le client a declare un transfert (reference mobile money)
 * confirmee   -> un administrateur a verifie la reception des fonds
 * liberee     -> la livraison associee a ete validee, les fonds sont
 *                consideres comme dus a l'etudiant
 * annulee     -> paiement rejete ou abandonne
 */
export enum StatutTransaction {
  EN_ATTENTE = 'en_attente',
  CONFIRMEE = 'confirmee',
  LIBEREE = 'liberee',
  ANNULEE = 'annulee',
}

export enum MethodePaiement {
  MVOLA = 'mvola',
  ORANGE_MONEY = 'orange_money',
  AIRTEL_MONEY = 'airtel_money',
  VIREMENT = 'virement',
}

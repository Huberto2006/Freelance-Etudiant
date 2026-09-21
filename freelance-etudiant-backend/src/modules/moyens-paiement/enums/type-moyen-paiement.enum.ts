/** Numero Mobile Money malgache : 10 chiffres, prefixe 03 (02-038/039 inclus). */
export const REGEX_NUMERO_MOBILE = /^0(32|33|34|38|39)\d{7}$/;

/**
 * Types de moyens de paiement supportes par la plateforme.
 * RG-PAY : un etudiant peut enregistrer plusieurs moyens de paiement
 * afin que le client soit oriente vers le numero Mobile Money ou le
 * compte bancaire de l'etudiant lorsque le paiement est reellement du.
 */
export enum TypeMoyenPaiement {
  MVOLA = 'MVOLA',
  ORANGE_MONEY = 'ORANGE_MONEY',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  BANQUE = 'BANQUE',
}

/** Libelle d'affichage par defaut de l'operateur pour un type donne. */
export const OPERATEURS_PAR_DEFAUT: Record<TypeMoyenPaiement, string | null> = {
  [TypeMoyenPaiement.MVOLA]: 'MVola',
  [TypeMoyenPaiement.ORANGE_MONEY]: 'Orange Money',
  [TypeMoyenPaiement.AIRTEL_MONEY]: 'Airtel Money',
  [TypeMoyenPaiement.BANQUE]: null,
};

/** Types Mobile Money (numero au format malgache 03XXXXXXX requis). */
export const TYPES_MOBILE_MONEY: TypeMoyenPaiement[] = [
  TypeMoyenPaiement.MVOLA,
  TypeMoyenPaiement.ORANGE_MONEY,
  TypeMoyenPaiement.AIRTEL_MONEY,
];

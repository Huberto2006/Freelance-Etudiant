/**
 * Types d'evenements declenchant une notification in-app.
 */
export enum TypeNotification {
  NOUVELLE_CANDIDATURE = 'nouvelle_candidature',
  CANDIDATURE_ACCEPTEE = 'candidature_acceptee',
  CANDIDATURE_REFUSEE = 'candidature_refusee',
  NOUVEAU_MESSAGE = 'nouveau_message',
  LIVRAISON_DEPOSEE = 'livraison_deposee',
  LIVRAISON_VALIDEE = 'livraison_validee',
  CORRECTION_DEMANDEE = 'correction_demandee',
  NOUVELLE_EVALUATION = 'nouvelle_evaluation',
  NOUVEAU_COMMENTAIRE = 'nouveau_commentaire',
  PAIEMENT_INITIE = 'paiement_initie',
  PAIEMENT_CONFIRME = 'paiement_confirme',
  PAIEMENT_LIBERE = 'paiement_libere',
  NOUVELLE_REACTION = 'nouvelle_reaction',
}

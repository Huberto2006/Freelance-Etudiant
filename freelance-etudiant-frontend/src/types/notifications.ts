export type TypeNotification =
  | "nouvelle_invitation_groupe"
  | "nouvelle_candidature"
  | "candidature_acceptee"
  | "candidature_refusee"
  | "nouveau_message"
  | "livraison_deposee"
  | "livraison_validee"
  | "correction_demandee"
  | "nouvelle_evaluation"
  | "nouveau_commentaire"
  | "paiement_initie"
  | "paiement_confirme"
  | "paiement_libere"
  | "paiement_echoue"
  | "nouvelle_reaction"
  | "mission_expiree"
  | "mention";

export interface NotificationItem {
  id: string;

  type: TypeNotification;

  titre: string;

  message: string;

  lienUrl?: string | null;

  estLue: boolean;

  destinataireId: string;

  dateCreation: string;
}

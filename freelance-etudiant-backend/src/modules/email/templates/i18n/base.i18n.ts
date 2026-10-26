import type { Dictionnaire } from '../../../../common/i18n/formatage';

/** Textes communs a tous les emails du module `email` (pied de page). */
export interface TextesBase {
  /** Premiere ligne du pied de page. */
  piedPage: string;
  /** Seconde ligne du pied de page (conseil de securite). */
  piedPageSecurite: string;
}

export const BASE_I18N: Dictionnaire<TextesBase> = {
  fr: {
    piedPage:
      'Vous recevez cet email car une action a été effectuée sur votre compte KIANJA.',
    piedPageSecurite:
      "Si vous n'en êtes pas l'auteur, contactez rapidement le support.",
  },
  en: {
    piedPage:
      'You are receiving this email because an action was taken on your KIANJA account.',
    piedPageSecurite:
      "If this wasn't you, please contact support right away.",
  },
  mg: {
    piedPage:
      "Nahazo ity mailaka ity ianao satria nisy zavatra natao tao amin'ny kaontinao KIANJA.",
    piedPageSecurite:
      "Raha tsy ianao no nanao izany, mifandraisa haingana amin'ny fanampiana (support).",
  },
};

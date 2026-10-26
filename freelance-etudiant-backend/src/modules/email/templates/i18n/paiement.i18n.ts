import type { Dictionnaire } from '../../../../common/i18n/formatage';

export type TypePaiementEmail = 'initie' | 'confirme' | 'libere';

/** Valeurs deja preparees : decorees/echappees en HTML, brutes en texte. */
export interface ValeursPaiement {
  montant: string;
  mission: string;
  reference: string;
}

export interface TextesPaiementEvenement {
  /** Recoit le titre de mission brut (nettoye ensuite par le template). */
  sujet: (titreMission: string) => string;
  titre: string;
  corps: (v: ValeursPaiement) => string;
}

export interface TextesPaiement {
  bonjour: (nom: string) => string;
  /** Rappel de securite financier affiche sous chaque email de paiement. */
  securite: string;
  evenements: Record<TypePaiementEmail, TextesPaiementEvenement>;
}

export const PAIEMENT_I18N: Dictionnaire<TextesPaiement> = {
  fr: {
    bonjour: (nom) => `Bonjour ${nom},`,
    securite:
      'KIANJA ne vous demandera jamais votre code PIN, votre code Mobile Money ou votre mot de passe par email. Si vous ne reconnaissez pas cette opération, contactez le support.',
    evenements: {
      initie: {
        sujet: (t) => `KIANJA - Paiement déclaré pour "${t}"`,
        titre: 'Paiement déclaré',
        corps: (v) =>
          `Le client a déclaré un paiement de ${v.montant} pour la mission ${v.mission} (réf. ${v.reference}). Il sera vérifié par la plateforme avant le début du travail.`,
      },
      confirme: {
        sujet: (t) => `KIANJA - Paiement confirmé pour "${t}"`,
        titre: 'Paiement confirmé',
        corps: (v) =>
          `Le paiement de ${v.montant} pour la mission ${v.mission} (réf. ${v.reference}) a été vérifié et confirmé par la plateforme.`,
      },
      libere: {
        sujet: (t) => `KIANJA - Fonds libérés pour "${t}"`,
        titre: 'Fonds libérés',
        corps: (v) =>
          `Les fonds de ${v.montant} pour la mission ${v.mission} (réf. ${v.reference}) vous sont dus : la livraison a été validée par le client et le paiement a été libéré.`,
      },
    },
  },
  en: {
    bonjour: (nom) => `Hello ${nom},`,
    securite:
      'KIANJA will never ask for your PIN, your Mobile Money code or your password by email. If you do not recognise this transaction, please contact support.',
    evenements: {
      initie: {
        sujet: (t) => `KIANJA - Payment declared for "${t}"`,
        titre: 'Payment declared',
        corps: (v) =>
          `The client has declared a payment of ${v.montant} for the mission ${v.mission} (ref. ${v.reference}). It will be checked by the platform before work begins.`,
      },
      confirme: {
        sujet: (t) => `KIANJA - Payment confirmed for "${t}"`,
        titre: 'Payment confirmed',
        corps: (v) =>
          `The payment of ${v.montant} for the mission ${v.mission} (ref. ${v.reference}) has been checked and confirmed by the platform.`,
      },
      libere: {
        sujet: (t) => `KIANJA - Funds released for "${t}"`,
        titre: 'Funds released',
        corps: (v) =>
          `The funds of ${v.montant} for the mission ${v.mission} (ref. ${v.reference}) are due to you: the delivery was approved by the client and the payment has been released.`,
      },
    },
  },
  mg: {
    bonjour: (nom) => `Manao ahoana ${nom},`,
    securite:
      "Tsy hangataka aminao amin'ny mailaka mihitsy ny KIANJA ny kaody PIN, ny kaody Mobile Money na ny teny miafinao. Raha tsy fantatrao ity fanaovana ity, mifandraisa amin'ny fanampiana (support).",
    evenements: {
      initie: {
        sujet: (t) => `KIANJA - Fandoavam-bola voambara ho an'ny "${t}"`,
        titre: 'Fandoavam-bola voambara',
        corps: (v) =>
          `Nanambara fa nandoa ${v.montant} ho an'ny iraka ${v.mission} (ref. ${v.reference}) ny mpanjifa. Hodinihin'ny sehatra izany alohan'ny hanombohan'ny asa.`,
      },
      confirme: {
        sujet: (t) => `KIANJA - Voamarina ny fandoavam-bola ho an'ny "${t}"`,
        titre: 'Voamarina ny fandoavam-bola',
        corps: (v) =>
          `Ny fandoavam-bola ${v.montant} ho an'ny iraka ${v.mission} (ref. ${v.reference}) dia nodinihin'ny sehatra ary voamarina.`,
      },
      libere: {
        sujet: (t) => `KIANJA - Nafahana ny vola ho an'ny "${t}"`,
        titre: 'Nafahana ny vola',
        corps: (v) =>
          `Ny vola ${v.montant} ho an'ny iraka ${v.mission} (ref. ${v.reference}) dia anjaranao: nankatoavin'ny mpanjifa ny asa natolotra ary nafahana ny fandoavam-bola.`,
      },
    },
  },
};

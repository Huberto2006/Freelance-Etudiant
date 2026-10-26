import type { Dictionnaire } from '../../../../common/i18n/formatage';

export type EvenementClient =
  | 'nouvelleCandidature'
  | 'nouvelleLivraison'
  | 'demandeServiceAcceptee';

export interface TextesEvenementClient {
  titre: string;
  sujet: string;
  message: string;
  bouton: string;
}

export interface TextesNotificationsClient {
  badge: string;
  etudiant: string;
  date: string;
  details: string;
  texteDetails: string;
  evenements: Record<EvenementClient, TextesEvenementClient>;
}

export const NOTIFICATIONS_CLIENT_I18N: Dictionnaire<TextesNotificationsClient> = {
  fr: {
    badge: 'Information',
    etudiant: 'Étudiant :',
    date: 'Date :',
    details: 'Vous pouvez consulter les détails depuis votre espace Kianja.',
    texteDetails: 'Consultez les détails depuis votre espace Kianja :',
    evenements: {
      nouvelleCandidature: {
        titre: 'Nouvelle candidature',
        sujet: 'Kianja — Nouvelle candidature pour votre mission',
        message: 'Un étudiant vient de candidater à votre mission.',
        bouton: 'Consulter la candidature',
      },
      nouvelleLivraison: {
        titre: 'Nouvelle livraison disponible',
        sujet: 'Kianja — Nouvelle livraison à consulter',
        message: 'Une nouvelle livraison est disponible pour votre mission.',
        bouton: 'Consulter la livraison',
      },
      demandeServiceAcceptee: {
        titre: 'Demande de service acceptée',
        sujet: 'Kianja — Votre demande de service a été acceptée',
        message: "L'étudiant a accepté votre demande de service.",
        bouton: 'Consulter la demande',
      },
    },
  },
  en: {
    badge: 'Information',
    etudiant: 'Student:',
    date: 'Date:',
    details: 'You can view the details from your Kianja space.',
    texteDetails: 'View the details from your Kianja space:',
    evenements: {
      nouvelleCandidature: {
        titre: 'New application',
        sujet: 'Kianja — New application for your mission',
        message: 'A student has just applied to your mission.',
        bouton: 'View the application',
      },
      nouvelleLivraison: {
        titre: 'New delivery available',
        sujet: 'Kianja — New delivery to review',
        message: 'A new delivery is available for your mission.',
        bouton: 'View the delivery',
      },
      demandeServiceAcceptee: {
        titre: 'Service request accepted',
        sujet: 'Kianja — Your service request was accepted',
        message: 'The student has accepted your service request.',
        bouton: 'View the request',
      },
    },
  },
  mg: {
    badge: 'Fampahafantarana',
    etudiant: 'Mpianatra:',
    date: 'Daty:',
    details:
      "Azonao jerena ny antsipiriany ao amin'ny toerana misy anao ao amin'ny Kianja.",
    texteDetails:
      "Jereo ny antsipiriany ao amin'ny toerana misy anao ao amin'ny Kianja:",
    evenements: {
      nouvelleCandidature: {
        titre: 'Fangatahana vaovao',
        sujet: "Kianja — Fangatahana vaovao ho an'ny irakao",
        message: 'Misy mpianatra vao nangataka ny hanao ny irakao.',
        bouton: 'Hijery ny fangatahana',
      },
      nouvelleLivraison: {
        titre: 'Asa vaovao natolotra',
        sujet: 'Kianja — Asa vaovao natolotra hojerenao',
        message: "Misy asa vaovao natolotra ho an'ny irakao.",
        bouton: 'Hijery ny asa natolotra',
      },
      demandeServiceAcceptee: {
        titre: 'Nekena ny fangatahana tolotra',
        sujet: 'Kianja — Nekena ny fangatahanao tolotra',
        message: 'Nanaiky ny fangatahanao tolotra ny mpianatra.',
        bouton: 'Hijery ny fangatahana',
      },
    },
  },
};

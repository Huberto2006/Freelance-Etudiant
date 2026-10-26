import type { Dictionnaire } from '../../../../common/i18n/formatage';

export interface TextesCandidatureAcceptee {
  sujet: (titreMission: string) => string;
  titre: string;
  badge: string;
  /** Contient un <strong> constant. */
  introHtml: string;
  introTexte: (titreMission: string) => string;
  details: string;
  bouton: string;
  texteLien: string;
}

export const CANDIDATURE_ACCEPTEE_I18N: Dictionnaire<TextesCandidatureAcceptee> = {
  fr: {
    sujet: (t) => `Votre candidature a été acceptée — ${t}`,
    titre: 'Candidature acceptée !',
    badge: 'Acceptée',
    introHtml:
      'Bonne nouvelle ! Le client a sélectionné votre profil et a <strong>accepté votre candidature</strong> pour la mission suivante :',
    introTexte: (t) =>
      `Bonne nouvelle ! Votre candidature pour la mission "${t}" a été acceptée par le client.`,
    details:
      'Vous pouvez dès à présent consulter les détails du projet, échanger avec le client et préparer la réalisation de votre mission sur votre espace Kianja.',
    bouton: 'Accéder à ma candidature',
    texteLien:
      'Vous pouvez accéder aux détails de la mission et échanger avec le client en cliquant sur le lien ci-dessous :',
  },
  en: {
    sujet: (t) => `Your application was accepted — ${t}`,
    titre: 'Application accepted!',
    badge: 'Accepted',
    introHtml:
      'Great news! The client has selected your profile and <strong>accepted your application</strong> for the following mission:',
    introTexte: (t) =>
      `Great news! Your application for the mission "${t}" has been accepted by the client.`,
    details:
      'You can now review the project details, chat with the client and prepare to carry out your mission from your Kianja space.',
    bouton: 'View my application',
    texteLien:
      'You can view the mission details and chat with the client using the link below:',
  },
  mg: {
    sujet: (t) => `Nekena ny fangatahanao — ${t}`,
    titre: 'Nekena ny fangatahanao!',
    badge: 'Nekena',
    introHtml:
      "Vaovao tsara! Nifidy ny mombamomba anao ny mpanjifa ary <strong>nanaiky ny fangatahanao</strong> ho an'ity iraka manaraka ity:",
    introTexte: (t) =>
      `Vaovao tsara! Neken'ny mpanjifa ny fangatahanao ho an'ny iraka "${t}".`,
    details:
      "Azonao jerena avy hatrany ny antsipirian'ny tetikasa, afaka miresaka amin'ny mpanjifa ianao ary afaka manomana ny fanatanterahana ny iraka ao amin'ny toerana misy anao ao amin'ny Kianja.",
    bouton: 'Hijery ny fangatahako',
    texteLien:
      "Azonao jerena ny antsipirian'ny iraka ary afaka miresaka amin'ny mpanjifa amin'ny alalan'ity rohy eto ambany ity:",
  },
};

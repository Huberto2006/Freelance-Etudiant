import type { Dictionnaire } from '../../../../common/i18n/formatage';

/** Textes communs a tous les emails du module `emails`. */
export interface TextesLayout {
  /** Contient du HTML (<strong>) : texte constant, jamais de donnee utilisateur. */
  piedPageHtml: string;
  piedPageDescription: string;
  /** Salutation avec nom. */
  bonjourNom: (nom: string) => string;
  /** Salutation sans nom. */
  bonjour: string;
  signature: string;
  /** Texte au-dessus du lien de secours (apres un bouton). */
  lienSecours: string;
}

export const LAYOUT_I18N: Dictionnaire<TextesLayout> = {
  fr: {
    piedPageHtml: 'Vous recevez cet email car vous êtes inscrit sur <strong>Kianja</strong>.',
    piedPageDescription:
      'Plateforme de mise en relation entre étudiants freelances et clients.',
    bonjourNom: (nom) => `Bonjour ${nom},`,
    bonjour: 'Bonjour,',
    signature: "L'équipe Kianja",
    lienSecours:
      'Si le bouton ci-dessus ne fonctionne pas, vous pouvez copier ce lien dans votre navigateur :',
  },
  en: {
    piedPageHtml: 'You are receiving this email because you are registered on <strong>Kianja</strong>.',
    piedPageDescription:
      'A platform connecting freelance students and clients.',
    bonjourNom: (nom) => `Hello ${nom},`,
    bonjour: 'Hello,',
    signature: 'The Kianja team',
    lienSecours:
      "If the button above doesn't work, you can copy this link into your browser:",
  },
  mg: {
    piedPageHtml:
      "Nahazo ity mailaka ity ianao satria nisoratra anarana tao amin'ny <strong>Kianja</strong>.",
    piedPageDescription:
      'Sehatra mampifandray ny mpianatra freelance sy ny mpanjifa.',
    bonjourNom: (nom) => `Manao ahoana ${nom},`,
    bonjour: 'Manao ahoana,',
    signature: 'Ny ekipa Kianja',
    lienSecours:
      "Raha tsy mandeha ny bokotra eo ambony, azonao adika ao amin'ny navigateur-nao ity rohy ity:",
  },
};

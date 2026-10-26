import type { Dictionnaire } from '../../../../common/i18n/formatage';

export interface TextesVerificationEmail {
  sujet: string;
  titre: string;
  bonjour: (nom: string) => string;
  validite: (heures: number) => string;
  intro: (v: { validite: string }) => string;
  bouton: string;
  lienSecours: string;
  ignorer: string;
  securite: string;
  texteIntro: (v: { validite: string }) => string;
  texteIgnorer: string;
}

export const VERIFICATION_EMAIL_I18N: Dictionnaire<TextesVerificationEmail> = {
  fr: {
    sujet: 'KIANJA - Vérifiez votre adresse email',
    titre: 'Vérification de votre adresse email',
    bonjour: (nom) => `Bonjour ${nom},`,
    validite: (n) => `valable ${n} heure${n > 1 ? 's' : ''}`,
    intro: (v) =>
      `Bienvenue sur KIANJA ! Pour activer votre compte, confirmez votre adresse email en cliquant sur le bouton ci-dessous. Ce lien est ${v.validite} et ne peut être utilisé qu'une seule fois.`,
    bouton: 'Vérifier mon adresse email',
    lienSecours:
      'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
    ignorer:
      "Vous n'êtes pas à l'origine de cette inscription ? Ignorez cet email : aucun compte ne sera activé.",
    securite: 'Ne transmettez ce lien à personne.',
    texteIntro: (v) =>
      `Bienvenue sur KIANJA ! Pour activer votre compte, vérifiez votre adresse email en ouvrant ce lien (${v.validite}, à usage unique) :`,
    texteIgnorer:
      "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email : aucun compte ne sera activé.",
  },
  en: {
    sujet: 'KIANJA - Verify your email address',
    titre: 'Verify your email address',
    bonjour: (nom) => `Hello ${nom},`,
    validite: (n) => `valid for ${n} hour${n > 1 ? 's' : ''}`,
    intro: (v) =>
      `Welcome to KIANJA! To activate your account, confirm your email address by clicking the button below. This link is ${v.validite} and can only be used once.`,
    bouton: 'Verify my email address',
    lienSecours:
      "If the button doesn't work, copy this link into your browser:",
    ignorer:
      "Didn't sign up? Ignore this email: no account will be activated.",
    securite: 'Do not share this link with anyone.',
    texteIntro: (v) =>
      `Welcome to KIANJA! To activate your account, verify your email address by opening this link (${v.validite}, single use):`,
    texteIgnorer:
      "If you didn't sign up, ignore this email: no account will be activated.",
  },
  mg: {
    sujet: 'KIANJA - Hamarino ny adiresy mailakao',
    titre: 'Fanamarinana ny adiresy mailakao',
    bonjour: (nom) => `Manao ahoana ${nom},`,
    validite: (n) => `mandritra ny ${n} ora`,
    intro: (v) =>
      `Tonga soa eto amin'ny KIANJA! Mba hampandehanana ny kaontinao, hamarino ny adiresy mailakao amin'ny fanindriana ny bokotra eto ambany. Manan-kery ${v.validite} ity rohy ity ary azo ampiasaina indray mandeha ihany.`,
    bouton: 'Hamarina ny adiresy mailako',
    lienSecours:
      "Raha tsy mandeha ny bokotra, adikao ao amin'ny navigateur-nao ity rohy ity:",
    ignorer:
      "Tsy ianao ve no nisoratra anarana? Aza miraharaha ity mailaka ity: tsy hisy kaonty hampandehanina.",
    securite: 'Aza omena olona ity rohy ity.',
    texteIntro: (v) =>
      `Tonga soa eto amin'ny KIANJA! Mba hampandehanana ny kaontinao, hamarino ny adiresy mailakao amin'ny fanokafana ity rohy ity (manan-kery ${v.validite}, indray mandeha ihany):`,
    texteIgnorer:
      "Raha tsy ianao no nisoratra anarana, aza miraharaha ity mailaka ity: tsy hisy kaonty hampandehanina.",
  },
};

import type { Dictionnaire } from '../../../../common/i18n/formatage';

export interface TextesResetPassword {
  sujet: string;
  titre: string;
  bonjour: (nom: string) => string;
  /** Duree de validite lisible, ex. « valable 60 minutes ». */
  validite: (minutes: number) => string;
  /** `v.validite` est deja decore (gras en HTML, brut en texte). */
  intro: (v: { validite: string }) => string;
  bouton: string;
  lienSecours: string;
  ignorer: string;
  securite: string;
  /** Version texte brut : amorce avant le lien. */
  texteAmorce: (v: { validite: string }) => string;
}

export const RESET_PASSWORD_I18N: Dictionnaire<TextesResetPassword> = {
  fr: {
    sujet: 'KIANJA - Réinitialisation de votre mot de passe',
    titre: 'Nouveau mot de passe',
    bonjour: (nom) => `Bonjour ${nom},`,
    validite: (n) => `valable ${n} minute${n > 1 ? 's' : ''}`,
    intro: (v) =>
      `Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est ${v.validite} et ne peut être utilisé qu'une seule fois.`,
    bouton: 'Réinitialiser mon mot de passe',
    lienSecours:
      'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
    ignorer:
      "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email : votre mot de passe actuel reste actif.",
    securite:
      "Ne transmettez ce lien à personne : KIANJA ne vous demandera jamais votre mot de passe.",
    texteAmorce: (v) =>
      `Vous avez demandé la réinitialisation de votre mot de passe KIANJA.\nOuvrez ce lien (${v.validite}, à usage unique) :`,
  },
  en: {
    sujet: 'KIANJA - Reset your password',
    titre: 'New password',
    bonjour: (nom) => `Hello ${nom},`,
    validite: (n) => `valid for ${n} minute${n > 1 ? 's' : ''}`,
    intro: (v) =>
      `You requested a password reset. Click the button below to choose a new password. This link is ${v.validite} and can only be used once.`,
    bouton: 'Reset my password',
    lienSecours:
      "If the button doesn't work, copy this link into your browser:",
    ignorer:
      "Didn't request this? Ignore this email: your current password remains active.",
    securite:
      'Do not share this link with anyone: KIANJA will never ask you for your password.',
    texteAmorce: (v) =>
      `You requested a reset of your KIANJA password.\nOpen this link (${v.validite}, single use):`,
  },
  mg: {
    sujet: 'KIANJA - Fanovana ny teny miafinao',
    titre: 'Teny miafina vaovao',
    bonjour: (nom) => `Manao ahoana ${nom},`,
    validite: (n) => `mandritra ny ${n} minitra`,
    intro: (v) =>
      `Nangataka ny hanova ny teny miafinao ianao. Tsindrio ny bokotra eto ambany mba hisafidianana teny miafina vaovao. Manan-kery ${v.validite} ity rohy ity ary azo ampiasaina indray mandeha ihany.`,
    bouton: 'Hanova ny teny miafiko',
    lienSecours:
      "Raha tsy mandeha ny bokotra, adikao ao amin'ny navigateur-nao ity rohy ity:",
    ignorer:
      "Tsy ianao ve no nangataka izany? Aza miraharaha ity mailaka ity: mbola mihatra ny teny miafinao ankehitriny.",
    securite:
      "Aza omena olona ity rohy ity: tsy hangataka ny teny miafinao mihitsy ny KIANJA.",
    texteAmorce: (v) =>
      `Nangataka ny hanova ny teny miafinao KIANJA ianao.\nPetraho ity rohy ity (manan-kery ${v.validite}, indray mandeha ihany):`,
  },
};

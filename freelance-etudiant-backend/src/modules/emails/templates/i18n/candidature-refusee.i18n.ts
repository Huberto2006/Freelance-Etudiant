import type { Dictionnaire } from '../../../../common/i18n/formatage';

export interface TextesCandidatureRefusee {
  sujet: (titreMission: string) => string;
  titre: string;
  badge: string;
  intro: string;
  introTexte: (titreMission: string) => string;
  explication: string;
  encouragement: string;
  bouton: string;
  lienPlateforme: string;
  texteLien: string;
}

export const CANDIDATURE_REFUSEE_I18N: Dictionnaire<TextesCandidatureRefusee> = {
  fr: {
    sujet: (t) => `Mise à jour de votre candidature — ${t}`,
    titre: 'Mise à jour de candidature',
    badge: 'Information',
    intro:
      "Nous vous informons que votre candidature pour la mission suivante n'a pas été retenue par le client :",
    introTexte: (t) =>
      `Nous vous informons que votre candidature pour la mission "${t}" n'a pas été retenue par le client.`,
    explication:
      'Le choix des candidats dépend de critères spécifiques et le nombre de places est limité. De nombreuses autres opportunités correspondant à votre profil sont régulièrement publiées sur la plateforme.',
    encouragement:
      'Nous vous encourageons vivement à continuer à postuler aux missions disponibles.',
    bouton: "Découvrir d'autres missions",
    lienPlateforme: 'Lien vers la plateforme :',
    texteLien:
      "De nouvelles opportunités correspondant à vos compétences sont régulièrement publiées sur Kianja. N'hésitez pas à consulter les offres en cours :",
  },
  en: {
    sujet: (t) => `Update on your application — ${t}`,
    titre: 'Application update',
    badge: 'Information',
    intro:
      'We would like to let you know that your application for the following mission was not selected by the client:',
    introTexte: (t) =>
      `We would like to let you know that your application for the mission "${t}" was not selected by the client.`,
    explication:
      'Clients choose candidates based on specific criteria and the number of places is limited. Many other opportunities matching your profile are published regularly on the platform.',
    encouragement: 'We strongly encourage you to keep applying to available missions.',
    bouton: 'Discover other missions',
    lienPlateforme: 'Link to the platform:',
    texteLien:
      'New opportunities matching your skills are published regularly on Kianja. Feel free to browse the current offers:',
  },
  mg: {
    sujet: (t) => `Vaovao momba ny fangatahanao — ${t}`,
    titre: 'Vaovao momba ny fangatahana',
    badge: 'Fampahafantarana',
    intro:
      "Ampahafantarinay anao fa tsy voafidin'ny mpanjifa ny fangatahanao ho an'ity iraka manaraka ity:",
    introTexte: (t) =>
      `Ampahafantarinay anao fa tsy voafidin'ny mpanjifa ny fangatahanao ho an'ny iraka "${t}".`,
    explication:
      "Miankina amin'ny fepetra manokana ny fisafidianana ny kandida ary voafetra ny isan'ny toerana. Mivoaka tsy tapaka ao amin'ny sehatra ny iraka maro hafa mifanaraka amin'ny mombamomba anao.",
    encouragement:
      "Ampirisihina ianao hanohy hangataka ireo iraka misy.",
    bouton: 'Hijery iraka hafa',
    lienPlateforme: "Rohy mankany amin'ny sehatra:",
    texteLien:
      "Mivoaka tsy tapaka ao amin'ny Kianja ny fahafahana vaovao mifanaraka amin'ny fahaizanao. Jereo ireo tolotra misy ankehitriny:",
  },
};

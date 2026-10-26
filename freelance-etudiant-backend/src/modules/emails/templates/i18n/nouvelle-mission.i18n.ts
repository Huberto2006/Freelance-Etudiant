import type { Dictionnaire } from '../../../../common/i18n/formatage';

export interface TextesNouvelleMission {
  sujet: (titre: string) => string;
  titre: string;
  badge: string;
  intro: string;
  budget: string;
  dateLimite: string;
  incitation: string;
  bouton: string;
  lienDirect: string;
  texteIntro: string;
  texteTitre: string;
  texteCategorie: string;
  texteDescription: string;
  texteLien: string;
}

export const NOUVELLE_MISSION_I18N: Dictionnaire<TextesNouvelleMission> = {
  fr: {
    sujet: (t) => `Nouvelle mission disponible — ${t}`,
    titre: 'Nouvelle mission pour vous',
    badge: 'Nouvelle opportunité',
    intro:
      "Une nouvelle mission correspondant à vos compétences et votre profil vient d'être publiée sur Kianja :",
    budget: 'Budget :',
    dateLimite: 'Date limite :',
    incitation:
      "Ne tardez pas à déposer votre proposition pour maximiser vos chances d'être sélectionné par le client.",
    bouton: 'Voir la mission et postuler',
    lienDirect: 'Lien direct vers la mission :',
    texteIntro: "Une nouvelle mission vient d'être publiée sur Kianja :",
    texteTitre: 'Titre :',
    texteCategorie: 'Catégorie :',
    texteDescription: 'Description :',
    texteLien: 'Consultez tous les détails et déposez votre candidature ici :',
  },
  en: {
    sujet: (t) => `New mission available — ${t}`,
    titre: 'A new mission for you',
    badge: 'New opportunity',
    intro:
      'A new mission matching your skills and profile has just been published on Kianja:',
    budget: 'Budget:',
    dateLimite: 'Deadline:',
    incitation:
      "Don't wait too long to submit your proposal to maximise your chances of being selected by the client.",
    bouton: 'View the mission and apply',
    lienDirect: 'Direct link to the mission:',
    texteIntro: 'A new mission has just been published on Kianja:',
    texteTitre: 'Title:',
    texteCategorie: 'Category:',
    texteDescription: 'Description:',
    texteLien: 'See all the details and apply here:',
  },
  mg: {
    sujet: (t) => `Iraka vaovao misy — ${t}`,
    titre: 'Iraka vaovao ho anao',
    badge: 'Fahafahana vaovao',
    intro:
      "Misy iraka vaovao mifanaraka amin'ny fahaizanao sy ny mombamomba anao vao navoaka ao amin'ny Kianja:",
    budget: 'Teti-bola:',
    dateLimite: 'Daty farany:',
    incitation:
      "Aza mitaredretra manolotra ny tolotrao mba hitombo ny fahafahanao ho voafidin'ny mpanjifa.",
    bouton: 'Hijery ny iraka sy hangataka',
    lienDirect: 'Rohy mivantana mankany amin\'ny iraka:',
    texteIntro: "Misy iraka vaovao vao navoaka ao amin'ny Kianja:",
    texteTitre: 'Lohateny:',
    texteCategorie: 'Sokajy:',
    texteDescription: 'Fanazavana:',
    texteLien: 'Jereo ny antsipiriany rehetra ary asehoy ny fangatahanao eto:',
  },
};

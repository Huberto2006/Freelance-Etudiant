import {
  Clapperboard,
  Code2,
  Database,
  Languages,
  Megaphone,
  Palette,
  PenLine,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Categories de services de la plateforme. La colonne `categorie` etant
 * en texte libre cote base de donnees, cette liste sert de referentiel
 * pour l'affichage (icones, libelles accentues) et pour les suggestions
 * de la page d'accueil. Les filtres utilisent toujours la valeur brute
 * `valeur`, identique a celle saisie par les etudiants.
 */
export interface CategorieService {
  /** Valeur brute utilisee par le filtre backend (ex. "Developpement"). */
  valeur: string;
  /** Libelle affiche (ex. "Développement"). */
  libelle: string;
  /** Icône representative. */
  icon: LucideIcon;
  /** Courte description d'accompagnement. */
  description: string;
}

export const CATEGORIES_REPERENTIEL: CategorieService[] = [
  {
    valeur: "Developpement",
    libelle: "Développement",
    icon: Code2,
    description: "Sites web, applications, scripts…",
  },
  {
    valeur: "Design",
    libelle: "Design",
    icon: Palette,
    description: "Maquettes UI/UX, logotypes, illustrations…",
  },
  {
    valeur: "Redaction",
    libelle: "Rédaction",
    icon: PenLine,
    description: "Articles, mémoires, contenus web…",
  },
  {
    valeur: "Traduction",
    libelle: "Traduction",
    icon: Languages,
    description: "Français, anglais, malagasy…",
  },
  {
    valeur: "Marketing",
    libelle: "Marketing",
    icon: Megaphone,
    description: "Réseaux sociaux, SEO, campagnes…",
  },
  {
    valeur: "Video",
    libelle: "Vidéo",
    icon: Clapperboard,
    description: "Montage, sous-titrage, motion design…",
  },
  {
    valeur: "Data",
    libelle: "Data",
    icon: Database,
    description: "Analyses, tableaux de bord, bases de données…",
  },
  {
    valeur: "Administratif",
    libelle: "Administratif",
    icon: Wrench,
    description: "Saisie, classement, assistance…",
  },
];

/**
 * Cle de comparaison d'une categorie : sans accents, sans casse. A utiliser
 * pour TOUTE comparaison de categories cote client (filtre du catalogue) :
 * "Développement" et "Developpement" designent la meme categorie.
 */
export function cleCategorie(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Valeur de repli proposee dans les formulaires (categorie non listee). */
export const CATEGORIE_AUTRE = "Autre";

/**
 * Options de categorie pour les formulaires mission et service : le
 * referentiel + "Autre". Si la valeur courante (annonce a modifier) n'est
 * pas dans la liste, elle est ajoutee pour que l'edition ne perde jamais la
 * categorie existante ni ne bloque sur « categorie obligatoire ».
 */
export function optionsCategories(
  valeurCourante?: string,
): Array<{ valeur: string; libelle: string }> {
  const options = [
    ...CATEGORIES_REPERENTIEL.map(({ valeur, libelle }) => ({
      valeur,
      libelle,
    })),
    { valeur: CATEGORIE_AUTRE, libelle: "Autre" },
  ];
  const courante = valeurCourante?.trim();
  if (
    courante &&
    !options.some((o) => cleCategorie(o.valeur) === cleCategorie(courante))
  ) {
    options.push({ valeur: courante, libelle: libelleCategorie(courante) });
  }
  return options;
}

/** Corrige les accents des libelles saisis en texte libre. */
const CORRECTIONS_LIBELLES: Record<string, string> = {
  developpement: "Développement",
  developement: "Développement",
  design: "Design",
  redaction: "Rédaction",
  "rédaction": "Rédaction",
  traduction: "Traduction",
  marketing: "Marketing",
  "marketing digital": "Marketing digital",
  video: "Vidéo",
  "vidéo": "Vidéo",
  montage: "Montage vidéo",
  data: "Data",
  administratif: "Administratif",
  multimedia: "Multimédia",
  "multimédia": "Multimédia",
  autre: "Autre",
};

/**
 * Retourne un libelle lisible pour une valeur de categorie brute :
 * corrections d'accents connues, sinon capitalisation de la premiere
 * lettre.
 */
export function libelleCategorie(valeur: string): string {
  const corrige =
    CORRECTIONS_LIBELLES[valeur.trim().toLowerCase()] ??
    CORRECTIONS_LIBELLES[cleCategorie(valeur)];
  if (corrige) return corrige;
  return valeur.charAt(0).toUpperCase() + valeur.slice(1);
}

/**
 * Icone la plus proche pour une categorie libre : recherche par mots-cles
 * dans la valeur, avec un icone generique en dernier recours.
 */
export function iconePourCategorie(valeur: string): LucideIcon {
  const nom = valeur.trim().toLowerCase();
  const correspondances: Array<[RegExp, LucideIcon]> = [
    [/dev|code|web|site|app|program/, Code2],
    [/design|figma|ux|ui|graph|maquet|logo|illustr/, Palette],
    [/redac|écrit|ecrit|article|blog|contenu|memoire/, PenLine],
    [/traduc|langue|anglais|malagasy/, Languages],
    [/marketing|seo|social|communi|publi/, Megaphone],
    [/vid[eé]o|montage|motion|film/, Clapperboard],
    [/data|base|analy|sql|stat/, Database],
  ];
  for (const [motif, icon] of correspondances) {
    if (motif.test(nom)) return icon;
  }
  return Wrench;
}
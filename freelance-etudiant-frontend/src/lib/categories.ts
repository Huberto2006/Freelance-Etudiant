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
};

/**
 * Retourne un libelle lisible pour une valeur de categorie brute :
 * corrections d'accents connues, sinon capitalisation de la premiere
 * lettre.
 */
export function libelleCategorie(valeur: string): string {
  const corrige = CORRECTIONS_LIBELLES[valeur.trim().toLowerCase()];
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
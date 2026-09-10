/**
 * Configuration globale des thèmes pour Kianja.
 *
 * Chaque thème définit :
 * - une palette complète (primaire, secondaire, accent, fond, surface, texte)
 *   déclinée en mode clair et mode sombre ;
 * - une identité typographique (police d'affichage pour les titres, police de corps, police monospace) ;
 * - des métadonnées d'affichage pour le sélecteur (nom, pastille, description).
 */

export type ThemeId = "slate" | "blue" | "green" | "purple" | "amber";
export type ModeTheme = "clair" | "sombre";

export interface PaletteTheme {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  secondary: string;
  accent: string;
  paper: string;
  paperLight: string;
  ink: string;
  inkSoft: string;
}

export interface TypographieTheme {
  nomDisplay: string;
  fontDisplay: string;
  nomBody: string;
  fontBody: string;
  nomMono: string;
  fontMono: string;
}

export interface ThemeConfig {
  id: ThemeId;
  nom: string;
  description: string;
  pastilleCouleur: string; // Couleur représentative pour le sélecteur
  pastilleAccent: string;
  clair: PaletteTheme;
  sombre: PaletteTheme;
  typographie: TypographieTheme;
}

export const THEMES: ThemeConfig[] = [
  {
    id: "slate",
    nom: "Slate (Gris-bleu)",
    description: "Thème classique Kianja — Sobre, institutionnel et élégant",
    pastilleCouleur: "#475569",
    pastilleAccent: "#334155",
    clair: {
      primary: "#475569",
      primaryDark: "#334155",
      primarySoft: "rgba(71, 85, 105, 0.12)",
      secondary: "#64748b",
      accent: "#475569",
      paper: "#f8fafc",
      paperLight: "#ffffff",
      ink: "#0f172a",
      inkSoft: "#334155",
    },
    sombre: {
      primary: "#94a3b8",
      primaryDark: "#cbd5e1",
      primarySoft: "rgba(148, 163, 184, 0.15)",
      secondary: "#64748b",
      accent: "#94a3b8",
      paper: "#0f172a",
      paperLight: "#1e293b",
      ink: "#f1f5f9",
      inkSoft: "#94a3b8",
    },
    typographie: {
      nomDisplay: "Zilla Slab (Sérif moderne)",
      fontDisplay: '"Zilla Slab", Georgia, serif',
      nomBody: "Inter (Sans-serif)",
      fontBody: '"Inter", -apple-system, sans-serif',
      nomMono: "IBM Plex Mono",
      fontMono: '"IBM Plex Mono", monospace',
    },
  },
  {
    id: "blue",
    nom: "Bleu Océan",
    description: "Moderne, technologique et professionnel — Énergie et clarté",
    pastilleCouleur: "#2563eb",
    pastilleAccent: "#1d4ed8",
    clair: {
      primary: "#2563eb",
      primaryDark: "#1d4ed8",
      primarySoft: "rgba(37, 99, 235, 0.12)",
      secondary: "#3b82f6",
      accent: "#2563eb",
      paper: "#f0f7ff",
      paperLight: "#ffffff",
      ink: "#0f1e36",
      inkSoft: "#334e68",
    },
    sombre: {
      primary: "#60a5fa",
      primaryDark: "#93c5fd",
      primarySoft: "rgba(96, 165, 250, 0.15)",
      secondary: "#3b82f6",
      accent: "#60a5fa",
      paper: "#0b1329",
      paperLight: "#132247",
      ink: "#f0f6ff",
      inkSoft: "#9fb3c8",
    },
    typographie: {
      nomDisplay: "Plus Jakarta Sans (Moderne)",
      fontDisplay: '"Plus Jakarta Sans", "Inter", sans-serif',
      nomBody: "Plus Jakarta Sans",
      fontBody: '"Plus Jakarta Sans", "Inter", sans-serif',
      nomMono: "IBM Plex Mono",
      fontMono: '"IBM Plex Mono", monospace',
    },
  },
  {
    id: "green",
    nom: "Vert Émeraude",
    description: "Nature, fraîcheur et dynamisme — Équilibre et croissance",
    pastilleCouleur: "#059669",
    pastilleAccent: "#047857",
    clair: {
      primary: "#059669",
      primaryDark: "#047857",
      primarySoft: "rgba(5, 150, 105, 0.12)",
      secondary: "#10b981",
      accent: "#059669",
      paper: "#f2fbf7",
      paperLight: "#ffffff",
      ink: "#06281e",
      inkSoft: "#1e4e40",
    },
    sombre: {
      primary: "#34d399",
      primaryDark: "#6ee7b7",
      primarySoft: "rgba(52, 211, 153, 0.15)",
      secondary: "#10b981",
      accent: "#34d399",
      paper: "#062319",
      paperLight: "#0d382b",
      ink: "#ecfdf5",
      inkSoft: "#a7f3d0",
    },
    typographie: {
      nomDisplay: "Outfit (Géométrique)",
      fontDisplay: '"Outfit", "Inter", sans-serif',
      nomBody: "Inter (Sans-serif)",
      fontBody: '"Inter", -apple-system, sans-serif',
      nomMono: "IBM Plex Mono",
      fontMono: '"IBM Plex Mono", monospace',
    },
  },
  {
    id: "purple",
    nom: "Violet Impérial",
    description: "Créatif, raffiné et premium — Audace et distinction",
    pastilleCouleur: "#7c3aed",
    pastilleAccent: "#6d28d9",
    clair: {
      primary: "#7c3aed",
      primaryDark: "#6d28d9",
      primarySoft: "rgba(124, 58, 237, 0.12)",
      secondary: "#8b5cf6",
      accent: "#7c3aed",
      paper: "#faf5ff",
      paperLight: "#ffffff",
      ink: "#1e1035",
      inkSoft: "#4c3272",
    },
    sombre: {
      primary: "#a78bfa",
      primaryDark: "#c4b5fd",
      primarySoft: "rgba(167, 139, 250, 0.15)",
      secondary: "#8b5cf6",
      accent: "#a78bfa",
      paper: "#170b2c",
      paperLight: "#261347",
      ink: "#faf5ff",
      inkSoft: "#d8b4fe",
    },
    typographie: {
      nomDisplay: "Playfair Display (Élégant)",
      fontDisplay: '"Playfair Display", Georgia, serif',
      nomBody: "Plus Jakarta Sans",
      fontBody: '"Plus Jakarta Sans", "Inter", sans-serif',
      nomMono: "IBM Plex Mono",
      fontMono: '"IBM Plex Mono", monospace',
    },
  },
  {
    id: "amber",
    nom: "Ocre Malagasy",
    description: "Chaleureux, terre cuite et accueillant — Esprit terroir et proximité",
    pastilleCouleur: "#d97706",
    pastilleAccent: "#b45309",
    clair: {
      primary: "#d97706",
      primaryDark: "#b45309",
      primarySoft: "rgba(217, 119, 6, 0.12)",
      secondary: "#f59e0b",
      accent: "#d97706",
      paper: "#fffdfa",
      paperLight: "#ffffff",
      ink: "#291804",
      inkSoft: "#5c4018",
    },
    sombre: {
      primary: "#fbbf24",
      primaryDark: "#fde68a",
      primarySoft: "rgba(251, 191, 36, 0.15)",
      secondary: "#f59e0b",
      accent: "#fbbf24",
      paper: "#201608",
      paperLight: "#32230e",
      ink: "#fef3c7",
      inkSoft: "#fcd34d",
    },
    typographie: {
      nomDisplay: "Zilla Slab (Sérif chaleureux)",
      fontDisplay: '"Zilla Slab", Georgia, serif',
      nomBody: "Inter (Sans-serif)",
      fontBody: '"Inter", -apple-system, sans-serif',
      nomMono: "IBM Plex Mono",
      fontMono: '"IBM Plex Mono", monospace',
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "slate";
export const DEFAULT_MODE: ModeTheme = "clair";

export function getTheme(id: string | null | undefined): ThemeConfig {
  const trouve = THEMES.find((t) => t.id === id);
  return trouve ?? THEMES[0];
}

export function estThemeId(val: string | null | undefined): val is ThemeId {
  return THEMES.some((t) => t.id === val);
}

export function estModeTheme(val: string | null | undefined): val is ModeTheme {
  return val === "clair" || val === "sombre";
}

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

export const TAILLES_PAGE = [10, 20, 30, 50, 100] as const;
export const TAILLE_PAGE_DEFAUT = 10;

export type DirectionTri = "asc" | "desc";
export interface EtatTri {
  colonne: string;
  direction: DirectionTri;
}

export type ValeurTri = string | number | Date | null | undefined;

export interface ColonneDataTable<T> {
  id: string;
  entete: ReactNode;
  cellule: (ligne: T) => ReactNode;
  /** Fournie : la colonne devient triable sur cette valeur. */
  valeurTri?: (ligne: T) => ValeurTri;
  /** Fournie : le texte de cette colonne est pris en compte par la recherche. */
  texteRecherche?: (ligne: T) => string;
  alignement?: "gauche" | "droite";
  /** Masque la colonne sous ce point de rupture (le contenu doit rester accessible ailleurs). */
  masquerSous?: "sm" | "md" | "xl";
  classeCellule?: string;
}

export interface DataTableProps<T> {
  /** Lignes après application des filtres métier de la page. */
  lignes: T[];
  colonnes: ColonneDataTable<T>[];
  cleLigne: (ligne: T) => string;
  /** Légende lue par les lecteurs d'écran. */
  legende: string;
  /** Premier chargement : squelette tant qu'aucune ligne n'est disponible. */
  chargement?: boolean;
  erreur?: string | null;
  /** La page affiche déjà une panne : ne pas présenter la liste comme vide. */
  masquerVide?: boolean;
  onReessayer?: () => void;
  reessaiEnCours?: boolean;
  iconeVide: ComponentType<LucideProps>;
  messageVide: ReactNode;
  messageAucunResultat: ReactNode;
  /** Sans cette prop, la barre d'outils n'affiche pas de recherche. */
  placeholderRecherche?: string;
  libelleRecherche?: string;
  /** Filtres métier affichés à droite (leur état reste dans la page). */
  filtres?: ReactNode;
  filtresActifs?: boolean;
  onReinitialiserFiltres?: () => void;
  /** Change avec les filtres métier : ramène à la première page. */
  cleFiltres?: string;
  triInitial?: EtatTri;
}

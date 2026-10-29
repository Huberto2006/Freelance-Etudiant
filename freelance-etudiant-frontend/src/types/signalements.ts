import type { Utilisateur } from "./utilisateurs";

export type StatutSignalement =
  | "ouvert"
  | "en_cours"
  | "traite";

export type CibleSignalement =
  | "utilisateur"
  | "service"
  | "mission";

export interface Signalement {
  id: string;

  motif: string;

  description: string;

  cibleType: CibleSignalement;

  cibleId: string;

  statut: StatutSignalement;

  signaleParId: string;

  signalePar?: Utilisateur;

  traiteParId?: string;

  resolution?: string;

  dateSignalement: string;

  dateTraitement?: string | null;
}

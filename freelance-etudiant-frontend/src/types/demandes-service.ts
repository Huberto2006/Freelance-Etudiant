import type { ServiceOffert } from "./services";
import type { Utilisateur } from "./utilisateurs";

export type StatutDemandeService =
  | "en_attente"
  | "acceptee"
  | "refusee";

export interface DemandeService {
  id: string;

  serviceId: string;

  service?: ServiceOffert;

  clientId: string;

  client?: Utilisateur;

  cahierDesCharges: string;

  budgetPropose: number | string;

  delaiSouhaite: number;

  pieceJointeUrl?: string | null;

  pieceJointeNom?: string | null;

  statut: StatutDemandeService;

  missionId?: string | null;

  dateCreation: string;
}

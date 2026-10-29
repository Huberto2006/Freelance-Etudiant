import type { Candidature } from "./candidatures";
import type { Evaluation } from "./evaluations";

export type StatutLivraison =
  | "en_attente"
  | "validee"
  | "correction_demandee";

export interface Livraison {
  id: string;

  candidatureId: string;

  fichierUrl?: string | null;

  lienLivrable?: string | null;

  branche?: string | null;

  piecesJointes?: PieceJointeLivraison[] | null;

  commentaireLivraison?: string | null;

  statut: StatutLivraison;

  commentaireCorrection?: string | null;

  candidature?: Candidature;

  /**
   * Evaluations liées à cette livraison. Le backend charge cette
   * relation sur GET /livraisons/client/toutes et /livraisons/me :
   * elle permet au client de savoir si l'évaluation obligatoire
   * (fin de projet) a déjà été effectuée.
   */
  evaluations?: Evaluation[];

  dateLivraison: string;
}

export interface PieceJointeLivraison {
  url: string;

  nom: string;

  tailleOctets?: number;
}

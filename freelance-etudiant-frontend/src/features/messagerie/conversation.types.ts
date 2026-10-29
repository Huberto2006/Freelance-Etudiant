import type {
  MessageAvecUtilisateurs,
} from "@/features/messagerie/types";
import type { Role } from "@/types/utilisateurs";

/* =========================================================
   TYPES DE LA MESSAGERIE (page et panneau de détails)
   ========================================================= */

export interface LigneConversation {
  cle: string;
  type: "INDIVIDUEL" | "GROUPE";
  id: string;
  nom: string;
  photoUrl?: string | null;
  role?: Role | null;
  nombreMembres?: number;
  dernierContenu: string;
  dernierDate: string | null;
  dernierEstMoi: boolean;
  conversationVide: boolean;
  nonLus: number;
}

export type SelectionConversation =
  | {
      type: "INDIVIDUEL";
      id: string;
      nom: string;
    }
  | {
      type: "GROUPE";
      id: string;
      nom: string;
      nombreMembres?: number;
    };

export interface PieceJointeConversation {
  url: string;
  nom: string | null;
  auteur: string;
  dateEnvoi: string;
}

export type MessageSocket = MessageAvecUtilisateurs & {
  groupeId?: string | null;
};

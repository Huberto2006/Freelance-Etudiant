import type { Role } from "./types";

export interface MessageAvecUtilisateurs {
  id: string;
  contenu: string;
  expediteurId: string;
  destinataireId: string;
  groupeId?: string | null;
  /**
   * Le backend sérialise l'entité Utilisateur complète (relations
   * expediteur/destinataire de Message) : le typage documente ici les
   * champs réellement exploités par l'interface (nom, photo, rôle).
   */
  expediteur?: {
    id: string;
    nom: string;
    photoUrl?: string | null;
    role?: Role;
  };
  destinataire?: {
    id: string;
    nom: string;
    photoUrl?: string | null;
    role?: Role;
  };
  missionId?: string | null;
  pieceJointeUrl?: string | null;
  pieceJointeNom?: string | null;
  estLu: boolean;
  /**
   * Suppression logique : le message supprimé par son expéditeur reste
   * dans le fil (tombstone) avec un contenu masqué côté backend.
   */
  estSupprime?: boolean;
  supprimeParId?: string | null;
  dateEnvoi: string;
}

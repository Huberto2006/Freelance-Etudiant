export interface MessageAvecUtilisateurs {
  id: string;
  contenu: string;
  expediteurId: string;
  destinataireId: string;
  expediteur?: { id: string; nom: string };
  destinataire?: { id: string; nom: string };
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

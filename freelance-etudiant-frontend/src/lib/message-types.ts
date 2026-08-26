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
  dateEnvoi: string;
}

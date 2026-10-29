export interface ResultatMatching {
  etudiantId: string;

  nom: string;

  scoreCompatibilite: number;

  competencesCorrespondantes: string[];

  disponible: boolean;

  tarifHoraire?: number | null;
}

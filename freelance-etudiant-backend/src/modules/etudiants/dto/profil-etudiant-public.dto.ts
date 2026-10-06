export interface UtilisateurProfilEtudiantPublicDto {
  id: string;
  nom: string;
  photoUrl: string | null;
}

export class ProfilEtudiantPublicDto {
  utilisateurId!: string;
  universite!: string | null;
  niveauEtude!: string | null;
  filiere!: string | null;
  anneeEtude!: string | null;
  ville!: string | null;
  specialites!: string[];
  experience!: number;
  typeFreelance!: string | null;
  statutDisponibilite!: string | null;
  tarifHoraire!: number | string | null;
  tarifMinimum!: number | string | null;
  tarifMaximum!: number | string | null;
  githubUrl!: string | null;
  gitlabUrl!: string | null;
  linkedinUrl!: string | null;
  siteWeb!: string | null;
  competences!: string[];
  langues!: string[];
  disponibilite!: boolean;
  description!: string | null;
  portfolioUrls!: string[];
  scoreReputation!: number | string;
  noteMoyenne!: number | string;
  nombreMissionsTerminees!: number;
  utilisateur!: UtilisateurProfilEtudiantPublicDto | null;
}

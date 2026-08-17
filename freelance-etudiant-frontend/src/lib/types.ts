export type Role = "etudiant" | "client" | "admin";

export type StatutCandidature = "en_attente" | "acceptee" | "refusee";
export type StatutMission = "ouverte" | "en_cours" | "terminee" | "fermee";
export type StatutLivraison = "en_attente" | "validee" | "correction_demandee";
export type TypeClient = "particulier" | "entreprise";

export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  role: Role;
  photoUrl?: string | null;
  estActif: boolean;
  estSuspendu: boolean;
  dateInscription: string;
  profilEtudiant?: EtudiantProfile | null;
  profilClient?: ClientProfile | null;
}

export interface EtudiantProfile {
  utilisateurId: string;
  niveauEtude?: string | null;
  universite?: string | null;
  competences: string[];
  langues: string[];
  tarifHoraire?: number | null;
  disponibilite: boolean;
  description?: string | null;
  portfolioUrls: string[];
  scoreReputation: number | string;
  noteMoyenne: number | string;
  nombreMissionsTerminees: number;
  utilisateur?: Utilisateur;
}

export interface ClientProfile {
  utilisateurId: string;
  typeClient: TypeClient;
  nomEntreprise?: string | null;
  utilisateur?: Utilisateur;
}

export interface ServiceOffert {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  prix: number | string;
  delai: number;
  competences: string[];
  imagesUrls: string[];
  disponible: boolean;
  etudiantId: string;
  etudiant?: EtudiantProfile;
  dateCreation: string;
}

export interface Mission {
  id: string;
  titre: string;
  description: string;
  budget: number | string;
  dateLimite: string;
  categorie: string;
  competencesRequises: string[];
  statut: StatutMission;
  clientId: string;
  client?: ClientProfile;
  candidatures?: Candidature[];
  dateCreation: string;
}

export interface Candidature {
  id: string;
  prixPropose: number | string;
  delaiPropose: number;
  message?: string | null;
  statut: StatutCandidature;
  missionId: string;
  mission?: Mission;
  etudiantId: string;
  etudiant?: EtudiantProfile;
  livraison?: Livraison | null;
  dateCandidature: string;
}

export interface Livraison {
  id: string;
  candidatureId: string;
  fichierUrl?: string | null;
  lienLivrable?: string | null;
  commentaireLivraison?: string | null;
  statut: StatutLivraison;
  commentaireCorrection?: string | null;
  candidature?: Candidature;
  dateLivraison: string;
}

export interface Evaluation {
  id: string;
  note: number;
  commentaire?: string | null;
  livraisonId: string;
  evaluateurId: string;
  evalueId: string;
  dateEvaluation: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  utilisateur: { id: string; email: string; role: Role };
}

export interface ResultatMatching {
  etudiantId: string;
  nom: string;
  scoreCompatibilite: number;
  competencesCorrespondantes: string[];
  disponible: boolean;
  tarifHoraire?: number | null;
}

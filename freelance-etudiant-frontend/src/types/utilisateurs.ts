/**
 * "a_definir" : role transitoire d'un compte tout juste cree via Google,
 * avant le choix explicite etudiant/client (page /choix-role).
 */
export type Role = "etudiant" | "client" | "admin" | "a_definir";

export type TypeClient =
  | "particulier"
  | "entreprise";

export interface Utilisateur {
  id: string;

  nom: string;

  email: string;

  role: Role;

  photoUrl?: string | null;

  /** Langue d'interface preferee du compte (fr, mg, en). */
  langue?: "fr" | "mg" | "en";

  estActif: boolean;

  estSuspendu: boolean;

  /**
   * Adresse email confirmee via le lien de verification envoye a
   * l'inscription ; un compte non verifie ne peut pas se connecter.
   */
  emailVerifie: boolean;

  /** Origine du compte (LOCAL = email + mot de passe, GOOGLE = Google). */
  authProvider?: "LOCAL" | "GOOGLE";

  /** Renseigne (non null) lorsqu'un compte Google est lie. */
  googleId?: string | null;

  dateInscription: string;

  /**
   * Complétion obligatoire du profil, calculée côté backend
   * (ProfileCompletionService). Sert de repli si l'appel dédié
   * GET /users/me/profile-completion n'a pas encore répondu ; la
   * valeur à jour vient toujours de ce dernier.
   */
  profilComplete?: boolean;

  profilEtudiant?: EtudiantProfile | null;

  profilClient?: ClientProfile | null;
}

export interface OcrField<T = string | string[] | null> {
  value: T;
  confidence: "high" | "medium" | "low" | "null";
}

export interface OcrCvExtraction {
  rawText: string;
  fields: {
    nom?: OcrField<string>;
    email?: OcrField<string>;
    telephone?: OcrField<string>;
    universite?: OcrField<string>;
    filiere?: OcrField<string>;
    anneeEtude?: OcrField<string>;
    ville?: OcrField<string>;
    description?: OcrField<string>;
    competences?: OcrField<string[]>;
    langues?: OcrField<string[]>;
    githubUrl?: OcrField<string>;
    linkedinUrl?: OcrField<string>;
    siteWeb?: OcrField<string>;
    portfolioUrls?: OcrField<string[]>;
  };
  warnings: string[];
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

  // ==========================================================
  // Champs du questionnaire de complétion de profil (ÉTAPE G)
  // ==========================================================

  filiere?: string | null;

  anneeEtude?: string | null;

  ville?: string | null;

  telephone?: string | null;

  specialites?: string[];

  experience?: number;

  typeFreelance?: string | null;

  statutDisponibilite?: string | null;

  tarifMinimum?: number | null;

  tarifMaximum?: number | null;

  githubUrl?: string | null;

  gitlabUrl?: string | null;

  linkedinUrl?: string | null;

  siteWeb?: string | null;

  utilisateur?: Utilisateur;
}

/**
 * Réponse de GET /users/me/profile-completion : état de complétion du
 * profil calculé côté serveur (jamais forcé par le frontend). Utilisée
 * par le questionnaire de complétion et par le garde du dashboard.
 */
export interface EtapeCompletion {
  etape: string;
  terminee: boolean;
  total: number;
  manquants: number;
}

export interface CompletionProfil {
  role: Role;
  complete: boolean;
  progress: number;
  missingFields: string[];
  missingLabels: string[];
  nextStep: string | null;
  etapes: EtapeCompletion[];
}

export interface ClientProfile {
  utilisateurId: string;

  typeClient: TypeClient;

  nomEntreprise?: string | null;

  utilisateur?: Utilisateur;
}

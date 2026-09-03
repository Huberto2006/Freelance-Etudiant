  export type Role = "etudiant" | "client" | "admin";

  export type StatutCandidature =
    | "en_attente"
    | "acceptee"
    | "refusee";

  export type StatutMission =
    | "ouverte"
    | "en_cours"
    | "terminee"
    | "fermee";

  export type StatutLivraison =
    | "en_attente"
    | "validee"
    | "correction_demandee";

  export type TypeClient =
    | "particulier"
    | "entreprise";

  export interface Utilisateur {
    id: string;

    nom: string;

    email: string;

    role: Role;

    photoUrl?: string | null;

    estActif: boolean;

    estSuspendu: boolean;

    /**
     * Adresse email confirmee via le lien de verification envoye a
     * l'inscription ; un compte non verifie ne peut pas se connecter.
     */
    emailVerifie: boolean;

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

    imageUrl?: string | null;

    clientId: string;

    /**
     * Le backend charge le client de la mission.
     *
     * client.utilisateur permet notamment de récupérer
     * le nom et l'id de l'utilisateur client.
     */
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

    /**
     * Evaluations liées à cette livraison. Le backend charge cette
     * relation sur GET /livraisons/client/toutes et /livraisons/me :
     * elle permet au client de savoir si l'évaluation obligatoire
     * (fin de projet) a déjà été effectuée.
     */
    evaluations?: Evaluation[];

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

  export type TypeNotification =
    | "nouvelle_candidature"
    | "candidature_acceptee"
    | "candidature_refusee"
    | "nouveau_message"
    | "livraison_deposee"
    | "livraison_validee"
    | "correction_demandee"
    | "nouvelle_evaluation"
    | "nouveau_commentaire"
    | "paiement_initie"
    | "paiement_confirme"
    | "paiement_libere"
    | "nouvelle_reaction";

  export interface NotificationItem {
    id: string;

    type: TypeNotification;

    titre: string;

    message: string;

    lienUrl?: string | null;

    estLue: boolean;

    destinataireId: string;

    dateCreation: string;
  }

  export type TypeCibleFavori =
    | "mission"
    | "service"
    | "etudiant";

  export interface Favori {
    id: string;

    utilisateurId: string;

    cibleType: TypeCibleFavori;

    cibleId: string;

    dateAjout: string;
  }

  export type MethodePaiement =
    | "mvola"
    | "orange_money"
    | "airtel_money"
    | "virement";

  export type StatutTransaction =
    | "en_attente"
    | "confirmee"
    | "liberee"
    | "annulee";

  export interface Transaction {
    id: string;

    candidatureId: string;

    candidature?: Candidature;

    clientId: string;

    client?: Utilisateur;

    etudiantId: string;

    etudiant?: Utilisateur;

    montant: number | string;

    methode: MethodePaiement;

    reference: string;

    statut: StatutTransaction;

    /**
     * 'mvola' = paiement en ligne verifie par le backend aupres du
     * fournisseur ; 'manuel' = declaration verifiee par un admin.
     */
    provider?: string | null;

    /** Dernier statut brut renvoye par le fournisseur (ex. "Pending"). */
    providerStatut?: string | null;

    dateCreation: string;

    dateConfirmation?: string | null;

    dateLiberation?: string | null;
  }

  export type StatutSignalement =
    | "ouvert"
    | "en_cours"
    | "traite";

  export type CibleSignalement =
    | "utilisateur"
    | "service"
    | "mission";

  export interface Signalement {
    id: string;

    motif: string;

    description: string;

    cibleType: CibleSignalement;

    cibleId: string;

    statut: StatutSignalement;

    signaleParId: string;

    signalePar?: Utilisateur;

    traiteParId?: string;

    resolution?: string;

    dateSignalement: string;

    dateTraitement?: string | null;
  }

  export interface ReactionInfo {
    total: number;

    jaiReagi: boolean;
  }

  export type TypeCibleContenu = "mission" | "service";

  export interface Commentaire {
    id: string;

    contenu: string;

    auteurId: string;

    auteur?: Utilisateur;

    cibleType: TypeCibleContenu;

    cibleId: string;

    dateCreation: string;

    dateModification: string;
  }

  export type TypeReactionContenu = "jaime" | "jenaimepas";

  export interface InfoReactionsContenu {
    jaime: number;

    jenaimepas: number;

    maReaction: TypeReactionContenu | null;
  }

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

  export interface AuthResponse {
    accessToken: string;

    refreshToken: string;

    utilisateur: {
      id: string;
      email: string;
      role: Role;
    };
  }

  /**
   * Reponse de POST /auth/register : le compte est cree mais pas encore
   * utilisable, l'utilisateur doit d'abord confirmer son adresse email
   * (aucun jeton de session n'est delivre a cette etape).
   */
  export interface ReponseInscription {
    message: string;

    email: string;
  }

  export interface ResultatMatching {
    etudiantId: string;

    nom: string;

    scoreCompatibilite: number;

    competencesCorrespondantes: string[];

    disponible: boolean;

    tarifHoraire?: number | null;
  }
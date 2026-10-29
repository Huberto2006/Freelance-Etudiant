// ==========================================================
// AMITIÉ
// ==========================================================

export type StatutAmitie = "en_attente" | "acceptee" | "refusee";

/**
 * Presentation synthetique d'un profil etudiant renvoyee par le
 * module Amitie du backend (jamais d'entite Utilisateur brute).
 */
export interface ProfilAmitie {
  id: string;

  nom: string | null;

  photoUrl: string | null;

  niveauEtude: string | null;

  universite: string | null;

  competences: string[];
}

/**
 * Demande d'amitie : `demandeur` (recues) ou `receveur` (envoyees)
 * selon l'endpoint.
 */
export interface DemandeAmitie {
  id: string;

  statut: StatutAmitie;

  dateCreation: string;

  demandeur?: ProfilAmitie | null;

  receveur?: ProfilAmitie | null;
}

/**
 * Relation d'amitie acceptee (GET /amities) : `ami` pointe vers
 * l'autre etudiant, quelle que soit la direction de la demande
 * initiale.
 */
export interface RelationAmitie {
  id: string;

  statut: StatutAmitie;

  dateCreation: string;

  dateReponse: string | null;

  ami: ProfilAmitie | null;
}

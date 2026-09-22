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

/* =========================================================
   CONVERSATIONS (contrat backend ÉTAPE 3 — GET /messages)
   ========================================================= */

/**
 * Discriminant des deux formes de conversation du système de
 * messagerie Kianja (une seule table messages côté backend).
 */
export type TypeConversation = "INDIVIDUEL" | "GROUPE";

/**
 * Entrée de conversation individuelle renvoyée par GET /messages :
 * le format Message historique est conservé, enrichi du discriminant
 * et de l'interlocuteur.
 */
export interface ConversationIndividuelle extends MessageAvecUtilisateurs {
  type: "INDIVIDUEL";
  utilisateurId: string;
  nom: string;
}

/**
 * Entrée de conversation de groupe renvoyée par GET /messages :
 * une seule entrée par groupe dont l'utilisateur est membre actif.
 * Un groupe sans message a dernierMessage = null (aucun message
 * artificiel n'est créé côté backend).
 */
export interface ConversationGroupeResume {
  type: "GROUPE";
  groupeId: string;
  nom: string;
  nombreMembres: number;
  dernierMessage: MessageAvecUtilisateurs | null;
  nonLus: number;
}

export type ConversationResume =
  | ConversationIndividuelle
  | ConversationGroupeResume;

/** Compteur détaillé (GET /messages/non-lus/compteur). */
export interface CompteurNonLus {
  /** individuels + groupes (contrat historique du badge MessagesLink). */
  total: number;
  individuels: number;
  groupes: number;
}

import { Message } from '../entities/message.entity';

/**
 * Distinction explicite des deux formes de conversation du systeme de
 * messagerie Kianja (une seule table messages, cf. message.entity.ts) :
 * - INDIVIDUEL : messages entre deux utilisateurs (groupe_id NULL) ;
 * - GROUPE : conversation rattachee a un groupe (messages avec groupe_id).
 */
export enum TypeConversation {
  INDIVIDUEL = 'INDIVIDUEL',
  GROUPE = 'GROUPE',
}

/**
 * Conversation individuelle renvoyee par GET /messages.
 *
 * Etend Message (format historique conserve pour compatibilite avec le
 * frontend existant : expediteur, destinataire, contenu, estLu...) et
 * ajoute les champs de presentation de la liste de conversations.
 */
export interface ConversationIndividuelle extends Message {
  type: TypeConversation.INDIVIDUEL;

  /** Interlocuteur (l'autre participant de la conversation). */
  utilisateurId: string;
  nom: string;
}

/**
 * Conversation de groupe renvoyee par GET /messages.
 *
 * Une seule entree par groupe dont l'utilisateur est membre actif
 * (regle membres_groupes, cf. GroupesService.verifierMembreActif).
 * Un groupe sans aucun message apparait avec dernierMessage = null :
 * aucun message artificiel n'est cree.
 */
export interface ConversationGroupe {
  type: TypeConversation.GROUPE;

  groupeId: string;
  nom: string;
  nombreMembres: number;

  /** Dernier message du groupe (contenu masque s'il est supprime), ou null. */
  dernierMessage: Message | null;

  /**
   * Messages non lus pour l'utilisateur courant, calcules depuis
   * message_groupe_lectures (le champ estLu persiste reste reserve
   * aux conversations individuelles).
   */
  nonLus: number;
}

export type ConversationResume = ConversationIndividuelle | ConversationGroupe;

/** Compteur detaille des messages non lus (GET /messages/non-lus/compteur). */
export interface CompteurNonLus {
  /** individuels + groupes (contrat historique conserve). */
  total: number;
  individuels: number;
  groupes: number;
}

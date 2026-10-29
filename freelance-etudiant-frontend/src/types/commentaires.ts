import type { Role, Utilisateur } from "./utilisateurs";

export type TypeCibleContenu = "mission" | "service";

/**
 * Suggestion d'utilisateur pour l'autocompletion @mention des
 * commentaires (reponse de GET /commentaires/mentions-suggestions).
 */
export interface SuggestionMention {
  id: string;

  nom: string;

  role: Role;

  photoUrl?: string | null;

  sousTitre?: string | null;
}

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

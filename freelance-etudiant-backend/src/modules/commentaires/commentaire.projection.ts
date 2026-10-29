import type { Commentaire } from './entities/commentaire.entity';
import { projeterUtilisateur } from '../users/utilisateur.projection';

export type CommentairePublic = ReturnType<typeof projeterCommentaire>;

/** Projection PUBLIQUE d'un commentaire (auteur reduit a nom et photo). */
export function projeterCommentaire(commentaire: Commentaire) {
  return {
    id: commentaire.id,
    contenu: commentaire.contenu,
    auteurId: commentaire.auteurId,
    cibleType: commentaire.cibleType,
    cibleId: commentaire.cibleId,
    dateCreation: commentaire.dateCreation,
    dateModification: commentaire.dateModification,
    auteur: projeterUtilisateur(commentaire.auteur),
  };
}

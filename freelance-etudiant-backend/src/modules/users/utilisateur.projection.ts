import type { Utilisateur } from './entities/utilisateur.entity';

/**
 * Projection PUBLIQUE d'un utilisateur.
 *
 * Les endpoints publics (annuaire, detail) ne doivent jamais serialiser les
 * entites completes : `Utilisateur` expose email, googleId, etat du compte.
 * Cette fonction construit une liste blanche explicite des seuls champs
 * utiles a l'affichage.
 */
export function projeterUtilisateur(utilisateur?: Utilisateur | null) {
  if (!utilisateur) return undefined;
  return {
    id: utilisateur.id,
    nom: utilisateur.nom,
    photoUrl: utilisateur.photoUrl ?? null,
  };
}

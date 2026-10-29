import type { ClientProfile } from './entities/client-profile.entity';
import { projeterUtilisateur } from '../users/utilisateur.projection';

/** Projection PUBLIQUE d'un profil client (sans telephone ni email). */
export function projeterClient(client?: ClientProfile | null) {
  if (!client) return undefined;
  return {
    utilisateurId: client.utilisateurId,
    typeClient: client.typeClient,
    nomEntreprise: client.nomEntreprise ?? null,
    secteurActivite: client.secteurActivite ?? null,
    ville: client.ville ?? null,
    utilisateur: projeterUtilisateur(client.utilisateur),
  };
}

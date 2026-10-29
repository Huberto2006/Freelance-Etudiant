import type { Role } from "./utilisateurs";

export interface AuthResponse {
  accessToken: string;

  premiereConnexion: boolean;

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

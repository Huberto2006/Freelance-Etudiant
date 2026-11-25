import { Role } from '../../../common/enums/role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  sessionId?: string;
}

/**
 * `typ` distingue un access token d'un refresh token : sans ce claim, un
 * refresh token (7 jours) pourrait etre presente comme access token.
 * `jti` n'existe que sur les refresh tokens (id de la ligne refresh_tokens).
 * `sid` identifie la session active (id de la ligne user_sessions).
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  typ?: 'access' | 'refresh';
  jti?: string;
  sid?: string;
}

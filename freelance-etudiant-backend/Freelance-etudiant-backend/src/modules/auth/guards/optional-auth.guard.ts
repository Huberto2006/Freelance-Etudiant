import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Variante de JwtAuthGuard pour les routes publiques qui souhaitent
 * neanmoins connaitre l'utilisateur courant s'il est authentifie
 * (ex. savoir si l'utilisateur a deja reagi a un profil). N'echoue
 * jamais : en l'absence de jeton valide, `request.user` reste undefined.
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest(err: unknown, user: unknown) {
    return (user as any) ?? null;
  }
}

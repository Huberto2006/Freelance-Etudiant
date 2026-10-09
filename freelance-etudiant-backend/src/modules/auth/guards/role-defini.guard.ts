import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTORISER_ROLE_A_DEFINIR_KEY } from '../../../common/decorators/autoriser-role-a-definir.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Garde GLOBAL (enregistre apres JwtAuthGuard). Un compte Google tout juste
 * cree a le role transitoire A_DEFINIR : il possede un JWT valide mais ne
 * doit atteindre aucune fonctionnalite metier (messagerie, groupes,
 * commentaires...) avant d'avoir choisi etudiant ou client. Seules les
 * routes marquees @AutoriserRoleADefinir() lui sont ouvertes.
 *
 * Aucun effet sur les roles etudiant, client et admin, ni sur les routes
 * publiques (pas d'utilisateur authentifie).
 */
@Injectable()
export class RoleDefiniGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as
      | AuthenticatedUser
      | undefined;
    if (!user || user.role !== Role.A_DEFINIR) return true;

    const autorise = this.reflector.getAllAndOverride<boolean>(
      AUTORISER_ROLE_A_DEFINIR_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (autorise) return true;

    throw new ForbiddenException(
      'Choisissez votre role (etudiant ou client) pour continuer.',
    );
  }
}

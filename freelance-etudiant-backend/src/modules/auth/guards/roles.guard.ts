import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Verifie que le role de l'utilisateur authentifie fait partie des roles
 * autorises par @Roles(...) sur la route. Sans @Roles(), la route est
 * accessible a tout utilisateur authentifie.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const authUser = user as AuthenticatedUser;
    if (!authUser || !requiredRoles.includes(authUser.role)) {
      throw new ForbiddenException(
        `Acces reserve aux roles : ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}

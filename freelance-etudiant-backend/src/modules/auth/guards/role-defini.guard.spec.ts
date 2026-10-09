import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleDefiniGuard } from './role-defini.guard';
import {
  AUTORISER_ROLE_A_DEFINIR_KEY,
  AutoriserRoleADefinir,
} from '../../../common/decorators/autoriser-role-a-definir.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AuthController } from '../auth.controller';
import { UsersController } from '../../users/users.controller';

function contexte(user: unknown, autorise = false): ExecutionContext {
  class Cible {
    methode() {}
  }
  if (autorise) AutoriserRoleADefinir()(Cible.prototype, 'methode', {
    value: Cible.prototype.methode,
  });
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => Cible.prototype.methode,
    getClass: () => Cible,
  } as unknown as ExecutionContext;
}

describe('RoleDefiniGuard', () => {
  const garde = new RoleDefiniGuard(new Reflector());

  it('bloque un compte A_DEFINIR sur une route non autorisee', () => {
    expect(() => garde.canActivate(contexte({ role: Role.A_DEFINIR }))).toThrow(
      ForbiddenException,
    );
  });

  it('laisse passer un compte A_DEFINIR sur une route marquee', () => {
    expect(garde.canActivate(contexte({ role: Role.A_DEFINIR }, true))).toBe(true);
  });

  it.each([Role.ETUDIANT, Role.CLIENT, Role.ADMIN])(
    'ne change rien pour le role %s',
    (role) => {
      expect(garde.canActivate(contexte({ role }))).toBe(true);
    },
  );

  it('ne change rien pour une route publique (pas d\'utilisateur)', () => {
    expect(garde.canActivate(contexte(undefined))).toBe(true);
  });

  it('seules /users/me et /auth/choose-role sont marquees', () => {
    const reflector = new Reflector();
    const lire = (cible: object, nom: string) =>
      reflector.get<boolean>(
        AUTORISER_ROLE_A_DEFINIR_KEY,
        (cible as Record<string, never>)[nom],
      );
    expect(lire(UsersController.prototype, 'getMonProfil')).toBe(true);
    expect(lire(AuthController.prototype, 'choisirRole')).toBe(true);
    expect(lire(AuthController.prototype, 'lierGoogle')).toBeUndefined();
    expect(lire(AuthController.prototype, 'login')).toBeUndefined();
  });
});

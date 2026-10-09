import { SetMetadata } from '@nestjs/common';

export const AUTORISER_ROLE_A_DEFINIR_KEY = 'autoriser_role_a_definir';

/**
 * Autorise une route aux comptes Google dont le role n'est pas encore choisi
 * (Role.A_DEFINIR). Par defaut, ces comptes sont refuses partout (voir
 * RoleDefiniGuard) : seules les routes necessaires a la finalisation du
 * compte portent ce decorateur.
 */
export const AutoriserRoleADefinir = () =>
  SetMetadata(AUTORISER_ROLE_A_DEFINIR_KEY, true);

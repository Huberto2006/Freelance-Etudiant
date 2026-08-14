import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';

/**
 * Injecte l'utilisateur courant (extrait du payload JWT) dans un
 * handler de controleur : async find(@CurrentUser() user: AuthenticatedUser)
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    return data ? user?.[data] : user;
  },
);

import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Role } from '../../common/enums/role.enum';

describe('Authentification des sessions', () => {
  describe('refreshToken', () => {
    function creerAuth(payload: Record<string, unknown>) {
      const usersService = {};
      const jwtService = {
        verify: jest.fn(() => payload),
      };
      const configService = {
        get: jest.fn(),
        getOrThrow: jest.fn(() => 'secret-refresh'),
      };
      const refreshRepo = {
        findOne: jest.fn(),
        update: jest.fn(),
      };
      const sessionsService = {
        estSessionValide: jest.fn().mockResolvedValue(true),
      };
      const service = new AuthService(
        usersService as never,
        jwtService as never,
        configService as never,
        {} as never,
        {} as never,
        refreshRepo as never,
        sessionsService as never,
      );
      return { service, refreshRepo, sessionsService };
    }

    it('refuse un ancien refresh token sans identifiant de session', async () => {
      const { service, refreshRepo, sessionsService } = creerAuth({
        typ: 'refresh',
        jti: 'refresh-legacy',
        sub: 'user-1',
      });

      await expect(service.refreshToken('ancien-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionsService.estSessionValide).not.toHaveBeenCalled();
      expect(refreshRepo.findOne).not.toHaveBeenCalled();
    });

    it('refuse le refresh token d’une session révoquée', async () => {
      const { service, refreshRepo, sessionsService } = creerAuth({
        typ: 'refresh',
        jti: 'refresh-1',
        sub: 'user-1',
        sid: 'session-revoquee',
      });
      sessionsService.estSessionValide.mockResolvedValue(false);

      await expect(service.refreshToken('token-revoque')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionsService.estSessionValide).toHaveBeenCalledWith(
        'session-revoquee',
        'user-1',
      );
      expect(refreshRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('JwtStrategy', () => {
    function creerStrategie() {
      const usersService = {
        findById: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@example.mg',
          role: Role.CLIENT,
          estSuspendu: false,
          estActif: true,
        }),
      };
      const sessionsService = {
        validerEtActualiserActivite: jest.fn().mockResolvedValue(true),
      };
      const configService = {
        get: jest.fn(() => 'secret-access'),
      };
      const strategy = new JwtStrategy(
        configService as never,
        usersService as never,
        sessionsService as never,
      );
      return { strategy, usersService, sessionsService };
    }

    it('refuse un access token sans identifiant de session', async () => {
      const { strategy, sessionsService } = creerStrategie();

      await expect(
        strategy.validate({
          sub: 'user-1',
          email: 'user@example.mg',
          role: Role.CLIENT,
          typ: 'access',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(sessionsService.validerEtActualiserActivite).not.toHaveBeenCalled();
    });

    it('valide et enregistre l’activité de la session sur une requête authentifiée', async () => {
      const { strategy, sessionsService } = creerStrategie();

      await expect(
        strategy.validate({
          sub: 'user-1',
          email: 'user@example.mg',
          role: Role.CLIENT,
          typ: 'access',
          sid: 'session-1',
        }),
      ).resolves.toMatchObject({ id: 'user-1', sessionId: 'session-1' });
      expect(sessionsService.validerEtActualiserActivite).toHaveBeenCalledWith(
        'session-1',
        'user-1',
      );
    });
  });
});

import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../../common/enums/role.enum';

describe('SessionsController', () => {
  let controller: SessionsController;
  let service: {
    obtenirSessionActuelle: jest.Mock;
    listerSessionsUtilisateur: jest.Mock;
    revoquerAutresSessions: jest.Mock;
    revoquerSession: jest.Mock;
    revoquerToutesSessions: jest.Mock;
  };

  const user: AuthenticatedUser = {
    id: 'user-123',
    email: 'user@example.mg',
    role: Role.CLIENT,
    sessionId: 'session-courante-id',
  };

  beforeEach(() => {
    service = {
      obtenirSessionActuelle: jest.fn(),
      listerSessionsUtilisateur: jest.fn(),
      revoquerAutresSessions: jest.fn(),
      revoquerSession: jest.fn(),
      revoquerToutesSessions: jest.fn(),
    };
    controller = new SessionsController(service as unknown as SessionsService);
  });

  it('GET /auth/sessions/current retourne la session active courante', async () => {
    const mockSession = {
      id: 'session-courante-id',
      typeAppareil: 'desktop',
      navigateur: 'Chrome 122',
      systemeExploitation: 'Windows 10/11',
      adresseIp: '197.149.230.***',
      dateCreation: new Date(),
      derniereActivite: new Date(),
      dateExpiration: new Date(),
      estActuelle: true,
    };
    service.obtenirSessionActuelle.mockResolvedValue(mockSession);

    const res = await controller.obtenirSessionCourante(user);
    expect(res).toEqual(mockSession);
    expect(service.obtenirSessionActuelle).toHaveBeenCalledWith('user-123', 'session-courante-id');
  });

  it('GET /auth/sessions liste les sessions actives', async () => {
    service.listerSessionsUtilisateur.mockResolvedValue([]);
    await controller.listerSessions(user);
    expect(service.listerSessionsUtilisateur).toHaveBeenCalledWith('user-123', 'session-courante-id');
  });

  it('DELETE /auth/sessions/others revoque toutes les autres sessions', async () => {
    service.revoquerAutresSessions.mockResolvedValue({ message: 'ok', revoquees: 2 });
    const res = await controller.revoquerAutresSessions(user);
    expect(res.revoquees).toBe(2);
    expect(service.revoquerAutresSessions).toHaveBeenCalledWith('user-123', 'session-courante-id');
  });

  it('DELETE /auth/sessions/:id revoque une session specifique', async () => {
    service.revoquerSession.mockResolvedValue(undefined);
    const res = await controller.revoquerSession(user, 'session-cible');
    expect(res.message).toBe('Session révoquée avec succès');
    expect(service.revoquerSession).toHaveBeenCalledWith('session-cible', 'user-123');
  });

  it('DELETE /auth/sessions revoque toutes les sessions', async () => {
    service.revoquerToutesSessions.mockResolvedValue({ message: 'ok', revoquees: 5 });
    const res = await controller.revoquerToutesSessions(user);
    expect(res.revoquees).toBe(5);
    expect(service.revoquerToutesSessions).toHaveBeenCalledWith('user-123');
  });
});

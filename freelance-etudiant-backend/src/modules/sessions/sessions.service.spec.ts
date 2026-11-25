import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { TypeNotification } from '../notifications/enums/type-notification.enum';
import { Utilisateur } from '../users/entities/utilisateur.entity';

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let notificationsService: {
    creer: jest.Mock;
  };
  let emailService: {
    envoyerAlerteNouvelleConnexion: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  const utilisateur = {
    id: 'user-uuid-1',
    nom: 'Jean Rabe',
    email: 'jean@example.mg',
    role: 'etudiant' as never,
    langue: 'fr' as never,
    emailVerifie: true,
    estActif: true,
    estSuspendu: false,
    motDePasse: 'hash',
    dateInscription: new Date(),
  } as unknown as Utilisateur;

  beforeEach(() => {
    sessionRepo = {
      create: jest.fn((data) => ({ ...data, id: data.id || 'new-session-id' })),
      save: jest.fn(async (s) => s),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    notificationsService = {
      creer: jest.fn().mockResolvedValue(undefined),
    };
    emailService = {
      envoyerAlerteNouvelleConnexion: jest.fn().mockResolvedValue(true),
    };
    configService = {
      get: jest.fn((cle: string) =>
        cle === 'app.frontendUrl' ? 'https://kianja.mg' : undefined,
      ),
    };

    service = new SessionsService(
      sessionRepo as never,
      notificationsService as never,
      emailService as never,
      configService as never,
    );
  });

  describe('enregistrerSession', () => {
    it('enregistre une session et declenche une alerte si nouvel appareil', async () => {
      sessionRepo.findOne.mockResolvedValue(null); // aucun appareil precedent connu

      const mockReq = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'x-forwarded-for': '197.149.230.12',
        },
        socket: {},
      } as never;

      const session = await service.enregistrerSession(
        utilisateur,
        'hash123',
        new Date(Date.now() + 7 * 86400000),
        mockReq,
      );

      expect(session).toBeDefined();
      expect(session.typeAppareil).toBe('desktop');
      expect(session.navigateur).toBe('Chrome 122');
      expect(session.systemeExploitation).toBe('Windows 10/11');
      expect(session.adresseIp).toBe('197.149.230.***');

      // Notification in-app
      expect(notificationsService.creer).toHaveBeenCalledWith(
        expect.objectContaining({
          destinataireId: 'user-uuid-1',
          type: TypeNotification.NOUVELLE_CONNEXION,
        }),
      );

      // Email d'alerte
      expect(emailService.envoyerAlerteNouvelleConnexion).toHaveBeenCalledWith(
        'jean@example.mg',
        expect.objectContaining({
          nom: 'Jean Rabe',
          typeAppareil: 'desktop',
          navigateur: 'Chrome 122',
        }),
      );
    });

    it('alerte meme si le User-Agent correspond a une ancienne session', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 'previous-session' }); // deja connu

      const mockReq = {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        socket: {},
      } as never;

      await service.enregistrerSession(
        utilisateur,
        'hash123',
        new Date(Date.now() + 7 * 86400000),
        mockReq,
      );

      expect(notificationsService.creer).toHaveBeenCalledWith(
        expect.objectContaining({ type: TypeNotification.NOUVELLE_CONNEXION }),
      );
      expect(emailService.envoyerAlerteNouvelleConnexion).toHaveBeenCalled();
      expect(sessionRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('rafraichirSession', () => {
    it('met a jour le hash et l’activite sans envoyer de notification', async () => {
      const exp = new Date(Date.now() + 7 * 86400000);
      await service.rafraichirSession('session-1', 'new-hash', exp);

      expect(sessionRepo.update).toHaveBeenCalledWith(
        { id: 'session-1', dateRevocation: expect.anything() },
        expect.objectContaining({
          refreshTokenHash: 'new-hash',
          dateExpiration: exp,
        }),
      );
      expect(notificationsService.creer).not.toHaveBeenCalled();
    });
  });

  describe('estSessionValide', () => {
    it('retourne true si la session existe et n’est pas revoquee', async () => {
      sessionRepo.findOne.mockResolvedValue({ id: 'session-1' });

      const valide = await service.estSessionValide('session-1', 'user-uuid-1');
      expect(valide).toBe(true);
    });

    describe('validerEtActualiserActivite', () => {
      it('valide une session et actualise son activite quand elle est ancienne', async () => {
        sessionRepo.findOne.mockResolvedValue({
          id: 'session-1',
          derniereActivite: new Date(Date.now() - 120_000),
        });

        await expect(
          service.validerEtActualiserActivite('session-1', 'user-uuid-1'),
        ).resolves.toBe(true);

        expect(sessionRepo.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'session-1',
            utilisateurId: 'user-uuid-1',
            dateRevocation: expect.anything(),
            dateExpiration: expect.anything(),
            derniereActivite: expect.anything(),
          }),
          { derniereActivite: expect.any(Date) },
        );
      });

      it('ne revalide pas une session expiree/revoquee et evite les ecritures trop frequentes', async () => {
        sessionRepo.findOne.mockResolvedValue(null);
        await expect(
          service.validerEtActualiserActivite('session-1', 'user-uuid-1'),
        ).resolves.toBe(false);
        expect(sessionRepo.update).not.toHaveBeenCalled();

        sessionRepo.findOne.mockResolvedValue({
          id: 'session-1',
          derniereActivite: new Date(),
        });
        await expect(
          service.validerEtActualiserActivite('session-1', 'user-uuid-1'),
        ).resolves.toBe(true);
        expect(sessionRepo.update).not.toHaveBeenCalled();
      });
    });

    it('retourne false si la session est introuvable ou revoquee', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      const valide = await service.estSessionValide('session-1', 'user-uuid-1');
      expect(valide).toBe(false);
      expect(sessionRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateRevocation: expect.anything(),
            dateExpiration: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('listerSessionsUtilisateur', () => {
    it('liste les sessions actives en identifiant la session courante', async () => {
      sessionRepo.find.mockResolvedValue([
        {
          id: 'session-1',
          typeAppareil: 'desktop',
          navigateur: 'Chrome 122',
          systemeExploitation: 'Windows 10/11',
          adresseIp: '197.149.230.***',
          dateCreation: new Date(),
          derniereActivite: new Date(),
          dateExpiration: new Date(),
        },
        {
          id: 'session-2',
          typeAppareil: 'mobile',
          navigateur: 'Safari 17',
          systemeExploitation: 'iOS 17',
          adresseIp: '102.16.***',
          dateCreation: new Date(),
          derniereActivite: new Date(),
          dateExpiration: new Date(),
        },
      ]);

      const result = await service.listerSessionsUtilisateur('user-uuid-1', 'session-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[0].estActuelle).toBe(true);
      expect(result[1].id).toBe('session-2');
      expect(result[1].estActuelle).toBe(false);
      expect(sessionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateRevocation: expect.anything(),
            dateExpiration: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('revoquerSession', () => {
    it('revoque avec succes la session appartenant a l’utilisateur', async () => {
      sessionRepo.findOne.mockResolvedValue({
        id: 'session-1',
        utilisateurId: 'user-uuid-1',
        dateRevocation: null,
      });

      await service.revoquerSession('session-1', 'user-uuid-1');

      expect(sessionRepo.update).toHaveBeenCalledWith(
        { id: 'session-1', utilisateurId: 'user-uuid-1' },
        expect.objectContaining({ dateRevocation: expect.any(Date) }),
      );
    });

    it('lance NotFoundException si la session n’existe pas', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.revoquerSession('inexistante', 'user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('interdit et lance ForbiddenException si la session appartient a un autre utilisateur', async () => {
      sessionRepo.findOne.mockResolvedValue({
        id: 'session-autre',
        utilisateurId: 'autre-user-uuid',
      });

      await expect(service.revoquerSession('session-autre', 'user-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('revoquerAutresSessions', () => {
    it('revoque toutes les sessions sauf celle specifiee', async () => {
      sessionRepo.update.mockResolvedValue({ affected: 3 });

      const res = await service.revoquerAutresSessions('user-uuid-1', 'session-actuelle');

      expect(res.revoquees).toBe(3);
      expect(sessionRepo.update).toHaveBeenCalled();
    });
  });

  describe('revoquerToutesSessions', () => {
    it('revoque toutes les sessions de l’utilisateur', async () => {
      sessionRepo.update.mockResolvedValue({ affected: 4 });

      const res = await service.revoquerToutesSessions('user-uuid-1');

      expect(res.revoquees).toBe(4);
    });
  });
});

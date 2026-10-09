import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { CandidaturesService } from './candidatures.service';
import { Candidature } from './entities/candidature.entity';
import { Groupe } from '../groupes/entities/groupe.entity';
import { MembreGroupe } from '../groupes/entities/membre-groupe.entity';
import { Mission } from '../missions/entities/mission.entity';
import { MissionsService } from '../missions/missions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailsService } from '../emails/emails.service';
import { StatutCandidature } from '../../common/enums/statut-candidature.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';

describe('CandidaturesService accepter', () => {
  let service: CandidaturesService;
  let repo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let notificationsService: { creer: jest.Mock };

  beforeEach(async () => {
    repo = { findOne: jest.fn() };
    dataSource = { transaction: jest.fn() };
    notificationsService = { creer: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CandidaturesService,
        { provide: getRepositoryToken(Candidature), useValue: repo },
        { provide: getRepositoryToken(Groupe), useValue: {} },
        { provide: getRepositoryToken(MembreGroupe), useValue: {} },
        { provide: DataSource, useValue: dataSource },
        { provide: MissionsService, useValue: {} },
        { provide: NotificationsService, useValue: notificationsService },
        {
          provide: EmailsService,
          useValue: { sendCandidatureAcceptee: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = moduleRef.get(CandidaturesService);
  });

  it('refuse le client non proprietaire avant d’ouvrir une transaction', async () => {
    repo.findOne.mockResolvedValue({
      id: 'candidature-1',
      missionId: 'mission-1',
      statut: StatutCandidature.EN_ATTENTE,
      mission: { clientId: 'autre-client', titre: 'Mission test' },
    });

    await expect(
      service.accepter('candidature-1', 'client-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('verrouille la mission et conserve les ecritures dans la transaction', async () => {
    const candidature = Object.assign(new Candidature(), {
      id: 'candidature-1',
      missionId: 'mission-1',
      statut: StatutCandidature.EN_ATTENTE,
      mission: { id: 'mission-1', clientId: 'client-1', titre: 'Mission test' },
      etudiant: { utilisateurId: 'etudiant-1' },
    });
    const mission = Object.assign(new Mission(), {
      id: 'mission-1',
      clientId: 'client-1',
      statut: StatutMission.OUVERTE,
    });
    repo.findOne.mockResolvedValue(candidature);

    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(mission)
        .mockResolvedValueOnce(candidature),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    dataSource.transaction.mockImplementation(
      async (travail: (em: EntityManager) => Promise<unknown>) =>
        travail(manager as unknown as EntityManager),
    );

    await expect(
      service.accepter('candidature-1', 'client-1'),
    ).resolves.toMatchObject({ statut: StatutCandidature.ACCEPTEE });

    expect(manager.findOne).toHaveBeenNthCalledWith(
      1,
      Mission,
      expect.objectContaining({
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(manager.update).toHaveBeenNthCalledWith(
      1,
      Candidature,
      { id: 'candidature-1', statut: StatutCandidature.EN_ATTENTE },
      { statut: StatutCandidature.ACCEPTEE },
    );
    expect(manager.update).toHaveBeenNthCalledWith(
      2,
      Mission,
      { id: 'mission-1', statut: StatutMission.OUVERTE },
      { statut: StatutMission.EN_COURS },
    );
    expect(notificationsService.creer).toHaveBeenCalledTimes(1);
  });
});

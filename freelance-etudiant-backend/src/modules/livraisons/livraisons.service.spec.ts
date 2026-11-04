import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Candidature } from '../candidatures/entities/candidature.entity';
import { Mission } from '../missions/entities/mission.entity';
import { StatutCandidature } from '../candidatures/enums/statut-candidature.enum';
import { StatutMission } from '../missions/enums/statut-mission.enum';
import { Livraison } from './entities/livraison.entity';
import { StatutLivraison } from './enums/statut-livraison.enum';
import { LivraisonsService } from './livraisons.service';

describe('LivraisonsService', () => {
  const candidature = {
    id: 'candidature-1',
    missionId: 'mission-1',
    etudiantId: 'etudiant-1',
    statut: StatutCandidature.ACCEPTEE,
    mission: {
      id: 'mission-1',
      titre: 'Mission test',
      clientId: 'client-1',
      statut: StatutMission.EN_COURS,
      client: { utilisateur: { email: 'client@example.com', nom: 'Client' } },
    },
    etudiant: {
      utilisateurId: 'etudiant-1',
      utilisateur: { nom: 'Etudiant' },
    },
  } as Candidature;

  let service: LivraisonsService;
  let delivery: Livraison | null;
  let manager: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let repo: {
    findOne: jest.Mock;
    update: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let notifications: { creer: jest.Mock };
  let paiements: { libererSiConfirmee: jest.Mock };
  let emails: { sendNouvelleLivraisonClient: jest.Mock };

  beforeEach(() => {
    delivery = null;
    manager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === Mission) return candidature.mission;
        if (entity === Candidature) return candidature;
        if (entity === Livraison) return delivery;
        return null;
      }),
      create: jest.fn((entity: unknown, values: object) => ({
        ...(entity === Livraison ? { id: 'livraison-1' } : {}),
        ...values,
      })),
      save: jest.fn(async (_entity: unknown, value: Livraison) => {
        delivery = value;
        return value;
      }),
    };

    let tail: Promise<void> = Promise.resolve();
    const transaction = jest.fn(
      async (callback: (transactionManager: EntityManager) => Promise<unknown>) => {
        let release!: () => void;
        const previous = tail;
        tail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await callback(manager as unknown as EntityManager);
        } finally {
          release();
        }
      },
    );

    repo = {
      findOne: jest.fn(async () =>
        delivery ? Object.assign(delivery, { candidature }) : null,
      ),
      update: jest.fn(async (where: Partial<Livraison>, values: object) => {
        if (!delivery || where.id !== delivery.id || where.statut !== delivery.statut) {
          return { affected: 0 };
        }
        if (
          where.correctionUtilisee !== undefined &&
          where.correctionUtilisee !== delivery.correctionUtilisee
        ) {
          return { affected: 0 };
        }
        Object.assign(delivery, values);
        return { affected: 1 };
      }),
      manager: { transaction },
    };
    notifications = { creer: jest.fn().mockResolvedValue(undefined) };
    paiements = { libererSiConfirmee: jest.fn().mockResolvedValue(undefined) };
    emails = { sendNouvelleLivraisonClient: jest.fn().mockResolvedValue(undefined) };

    service = new LivraisonsService(
      repo as unknown as Repository<Livraison>,
      {
        findOne: jest.fn().mockResolvedValue(candidature),
        assertCandidatureAcceptee: jest.fn((value: Candidature) => {
          if (value.statut !== StatutCandidature.ACCEPTEE) {
            throw new ConflictException('Candidature non acceptee');
          }
        }),
      } as never,
      notifications as never,
      paiements as never,
      emails as never,
    );
  });

  it('refuse une seconde soumission directe tant que le client doit traiter la livraison', async () => {
    await service.creer('candidature-1', 'etudiant-1', {
      lienLivrable: 'https://github.com/exemple/projet',
      plateforme: 'github',
    });

    await expect(
      service.creer('candidature-1', 'etudiant-1', {
        lienLivrable: 'https://github.com/exemple/autre',
        plateforme: 'github',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(notifications.creer).toHaveBeenCalledTimes(1);
  });

  it('autorise une correction, garde la version précédente et bloque une seconde correction', async () => {
    const initiale = await service.creer('candidature-1', 'etudiant-1', {
      lienLivrable: 'https://github.com/exemple/initial',
      plateforme: 'github',
      commentaireLivraison: 'Version initiale',
    });

    await service.demanderCorrection(initiale.id, 'client-1', {
      commentaireCorrection: 'Merci de corriger le formulaire.',
    });
    const corrigee = await service.creer('candidature-1', 'etudiant-1', {
      lienLivrable: 'https://github.com/exemple/corrige',
      plateforme: 'github',
      commentaireLivraison: 'Version corrigée',
    });

    expect(corrigee.statut).toBe(StatutLivraison.EN_ATTENTE);
    expect(corrigee.correctionUtilisee).toBe(true);
    expect(corrigee.historique).toHaveLength(1);
    expect(corrigee.historique[0]).toMatchObject({
      lienLivrable: 'https://github.com/exemple/initial',
      commentaireLivraison: 'Version initiale',
      commentaireCorrection: 'Merci de corriger le formulaire.',
      statut: StatutLivraison.CORRECTION_DEMANDEE,
    });
    expect(corrigee.lienLivrable).toBe('https://github.com/exemple/corrige');
    await expect(
      service.creer('candidature-1', 'etudiant-1', {
        lienLivrable: 'https://github.com/exemple/troisieme',
        plateforme: 'github',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.demanderCorrection(corrigee.id, 'client-1', {
        commentaireCorrection: 'Nouvelle demande interdite.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('bloque définitivement une nouvelle soumission après validation', async () => {
    const submitted = await service.creer('candidature-1', 'etudiant-1', {
      lienLivrable: 'https://github.com/exemple/projet',
      plateforme: 'github',
    });
    await service.valider(submitted.id, 'client-1');

    expect(delivery?.dateValidation).toBeInstanceOf(Date);
    await expect(
      service.creer('candidature-1', 'etudiant-1', {
        lienLivrable: 'https://github.com/exemple/autre',
        plateforme: 'github',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse l’accès d’un autre étudiant et vérifie le verrou transactionnel en concurrence', async () => {
    await expect(
      service.creer('candidature-1', 'etudiant-2', {
        lienLivrable: 'https://github.com/exemple/projet',
        plateforme: 'github',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const resultats = await Promise.allSettled([
      service.creer('candidature-1', 'etudiant-1', {
        lienLivrable: 'https://github.com/exemple/a',
        plateforme: 'github',
      }),
      service.creer('candidature-1', 'etudiant-1', {
        lienLivrable: 'https://github.com/exemple/b',
        plateforme: 'github',
      }),
    ]);

    expect(resultats.filter((resultat) => resultat.status === 'fulfilled')).toHaveLength(1);
    expect(resultats.filter((resultat) => resultat.status === 'rejected')).toHaveLength(1);
    expect(repo.manager.transaction).toHaveBeenCalledTimes(2);
    expect(manager.findOne).toHaveBeenCalledWith(
      Mission,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });
});

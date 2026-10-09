import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaiementsService } from './paiements.service';
import { Transaction } from './entities/transaction.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { CandidaturesService } from '../candidatures/candidatures.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MvolaService } from './mvola.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { MoyensPaiementService } from '../moyens-paiement/moyens-paiement.service';
import { MoyensPaiementClientService } from '../moyens-paiement-client/moyens-paiement-client.service';
import {
  MethodePaiement,
  StatutTransaction,
} from '../../common/enums/statut-transaction.enum';
import { TypeMoyenPaiement } from '../moyens-paiement/enums/type-moyen-paiement.enum';

describe('PaiementsService', () => {
  let service: PaiementsService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mvolaService: {
    estConfigure: boolean;
    initierPaiement: jest.Mock;
  };
  let notificationsService: { creer: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((values: Partial<Transaction>) =>
        Object.assign(new Transaction(), values),
      ),
      save: jest.fn(),
      update: jest.fn(),
    };
    mvolaService = {
      estConfigure: true,
      initierPaiement: jest.fn(),
    };
    notificationsService = { creer: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaiementsService,
        { provide: getRepositoryToken(Transaction), useValue: repo },
        {
          provide: getRepositoryToken(Livraison),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: CandidaturesService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              id: 'candidature-1',
              prixPropose: 1000,
              mission: { clientId: 'client-1', titre: 'Mission test' },
              etudiant: { utilisateurId: 'etudiant-1' },
            }),
            assertCandidatureAcceptee: jest.fn(),
          },
        },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MvolaService, useValue: mvolaService },
        {
          provide: EmailService,
          useValue: { envoyerPaiementInitie: jest.fn().mockResolvedValue(true) },
        },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        {
          provide: MoyensPaiementService,
          useValue: {
            trouverPourPaiement: jest.fn().mockResolvedValue({
              id: 'moyen-etudiant-1',
              type: TypeMoyenPaiement.MVOLA,
              numero: '0341234567',
              nomTitulaire: 'Etudiant Test',
              operateur: 'MVola',
              nomBanque: null,
            }),
          },
        },
        {
          provide: MoyensPaiementClientService,
          useValue: { trouverPourPaiement: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(PaiementsService);
  });

  it('enregistre la reservation avant l’appel MVola et garde une trace en cas de resultat ambigu', async () => {
    const ordre: string[] = [];
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation(async (transaction: Transaction) => {
      ordre.push('reservation');
      transaction.id = 'transaction-1';
      return transaction;
    });
    repo.update.mockImplementation(async () => {
      ordre.push('mise-a-jour');
      return { affected: 1 };
    });
    mvolaService.initierPaiement.mockImplementation(async () => {
      ordre.push('mvola');
      throw new Error('timeout');
    });

    await expect(
      service.creer('candidature-1', 'client-1', {
        methode: MethodePaiement.MVOLA,
        telephoneDebite: '0341234567',
        moyenPaiementId: 'moyen-etudiant-1',
      }),
    ).rejects.toThrow(/resultat.*incertain/i);

    expect(ordre.slice(0, 2)).toEqual(['reservation', 'mvola']);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledWith(
      { id: 'transaction-1', statut: StatutTransaction.EN_ATTENTE },
      { providerStatut: 'initiation_inconnue' },
    );
    expect(notificationsService.creer).not.toHaveBeenCalled();
  });

  it('annulation concurrente : n’ecrase pas une confirmation deja commitee', async () => {
    const enAttente = Object.assign(new Transaction(), {
      id: 'transaction-1',
      provider: 'manuel',
      statut: StatutTransaction.EN_ATTENTE,
    });
    const confirmee = Object.assign(new Transaction(), {
      id: 'transaction-1',
      provider: 'manuel',
      statut: StatutTransaction.CONFIRMEE,
    });
    repo.findOne
      .mockResolvedValueOnce(enAttente)
      .mockResolvedValueOnce(confirmee);
    repo.update.mockResolvedValue({ affected: 0 });

    await expect(service.annuler('transaction-1')).resolves.toBe(confirmee);

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'transaction-1', statut: StatutTransaction.EN_ATTENTE },
      { statut: StatutTransaction.ANNULEE },
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(notificationsService.creer).not.toHaveBeenCalled();
  });
});

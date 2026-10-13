import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { MethodePaiement, StatutTransaction } from '../../common/enums/statut-transaction.enum';
import type { Transaction } from './entities/transaction.entity';

type Mock = jest.Mock;

function creer(options: { papiConfigure?: boolean } = {}) {
  const repo = { findOne: jest.fn(), save: jest.fn((t: unknown) => Promise.resolve(t)), create: jest.fn((t: unknown) => t) };
  const papi = {
    estConfigure: options.papiConfigure ?? true,
    creerPaiement: jest.fn(),
    verifierStatut: jest.fn(),
  };
  const mvola = { estConfigure: true, verifierStatut: jest.fn(), initierPaiement: jest.fn() };
  const config = { get: (k: string) => ({ FRONTEND_URL: 'https://kianja.test', API_PUBLIC_URL: 'https://api.kianja.test' })[k] };
  const notifications = { creer: jest.fn() };
  const email = { envoyerPaiementInitie: jest.fn() };
  const noop = {};

  const service = new PaiementsService(
    repo as never,
    noop as never,
    noop as never,
    notifications as never,
    mvola as never,
    papi as never,
    config as never,
    email as never,
    { findOne: jest.fn().mockResolvedValue({ email: 'e@e.test' }) } as never,
    noop as never,
    { trouverPourPaiement: jest.fn() } as never,
    { genererSansBloquer: jest.fn() } as never,
  );
  return { service, repo, papi, mvola, notifications, email };
}

function transaction(extra: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    statut: StatutTransaction.EN_ATTENTE,
    provider: 'papi',
    providerCorrelationId: 'pay_1',
    reference: 'KIANJA-1',
    methode: MethodePaiement.PAPI,
    ...extra,
  } as Transaction;
}

describe('PaiementsService — Papi', () => {
  describe('traiterWebhook (papi)', () => {
    it('ne croit jamais le statut du corps : relit Papi', async () => {
      const { service, repo, papi } = creer();
      const t = transaction();
      repo.findOne.mockResolvedValue(t);
      papi.verifierStatut.mockResolvedValue('pending');
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);

      const res = await service.traiterWebhook(
        { reference: 'KIANJA-1', id: 'pay_1', status: 'paid' },
        'papi',
      );

      expect(papi.verifierStatut).toHaveBeenCalledWith('pay_1');
      expect(confirmer).not.toHaveBeenCalled();
      expect(res).toEqual({ status: 'pending' });
    });

    it('confirme quand Papi confirme', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('completed');
      const confirmer = jest
        .spyOn(service as never, 'marquerConfirmee' as never)
        .mockResolvedValue(undefined as never);

      const res = await service.traiterWebhook({ id: 'pay_1' }, 'papi');
      expect(confirmer).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ status: 'confirmed' });
    });

    it('annule quand Papi annonce un echec', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('failed');
      const annuler = jest
        .spyOn(service as never, 'marquerAnnulee' as never)
        .mockResolvedValue(undefined as never);
      await expect(service.traiterWebhook({ id: 'pay_1' }, 'papi')).resolves.toEqual({
        status: 'cancelled',
      });
      expect(annuler).toHaveBeenCalledTimes(1);
    });

    it('est idempotent : transaction deja traitee ignoree sans appel Papi', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ statut: StatutTransaction.CONFIRMEE }));
      await expect(service.traiterWebhook({ id: 'pay_1' }, 'papi')).resolves.toEqual({
        status: 'ignored',
      });
      expect(papi.verifierStatut).not.toHaveBeenCalled();
    });

    it('refuse un webhook Papi visant une transaction MVola ou manuelle', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ provider: 'mvola' }));
      await expect(service.traiterWebhook({ id: 'pay_1' }, 'papi')).rejects.toThrow(
        BadRequestException,
      );
      repo.findOne.mockResolvedValue(transaction({ provider: 'manuel', providerCorrelationId: null }));
      await expect(service.traiterWebhook({ id: 'x' }, 'papi')).rejects.toThrow(BadRequestException);
      expect(papi.verifierStatut).not.toHaveBeenCalled();
    });

    it('rejette une notification sans identifiant ni reference', async () => {
      const { service } = creer();
      await expect(service.traiterWebhook({ status: 'paid' }, 'papi')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('repond 503 si Papi est injoignable (reessai possible), sans confirmer', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockRejectedValue(new Error('timeout'));
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);
      await expect(service.traiterWebhook({ id: 'pay_1' }, 'papi')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(confirmer).not.toHaveBeenCalled();
    });
  });

  describe('verifier / confirmer / annuler', () => {
    it('verifier() interroge Papi pour une transaction Papi', async () => {
      const { service, repo, papi, mvola } = creer();
      repo.findOne.mockResolvedValue(transaction({ clientId: 'c1' } as never));
      papi.verifierStatut.mockResolvedValue('pending');
      await service.verifier('t1', 'c1');
      expect(papi.verifierStatut).toHaveBeenCalledWith('pay_1');
      expect(mvola.verifierStatut).not.toHaveBeenCalled();
    });

    it("un paiement Papi ne peut etre confirme ni annule a la main", async () => {
      const { service, repo } = creer();
      repo.findOne.mockResolvedValue(transaction());
      await expect(service.confirmer('t1')).rejects.toThrow(/ne peut pas etre confirme/);
      await expect(service.annuler('t1')).rejects.toThrow(/ne peut pas etre annule/);
    });
  });

  describe('creerPaiementPapi', () => {
    const candidature = {
      mission: { titre: 'Site vitrine' },
      etudiant: { utilisateurId: 'e1', utilisateur: { nom: 'Rasoa' } },
    };
    const appeler = (s: PaiementsService) =>
      (s as unknown as {
        creerPaiementPapi: (...a: unknown[]) => Promise<Transaction>;
      }).creerPaiementPapi(candidature, 'cand1', 'c1', 75000, {});

    it('refuse si Papi n\'est pas configure, sans rien creer', async () => {
      const { service, papi, repo } = creer({ papiConfigure: false });
      await expect(appeler(service)).rejects.toThrow(ServiceUnavailableException);
      expect(papi.creerPaiement).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('envoie le montant serveur et enregistre lien + identifiant fournisseur', async () => {
      const { service, papi, repo } = creer();
      papi.creerPaiement.mockResolvedValue({
        idFournisseur: 'pay_9',
        lienPaiement: 'https://pay.papi.test/9',
        statut: 'pending',
      });

      const t = await appeler(service);

      const appel = (papi.creerPaiement as Mock).mock.calls[0][0] as {
        montantAr: number;
        reference: string;
        urlRetour: string;
        urlNotification: string;
      };
      expect(appel.montantAr).toBe(75000);
      expect(appel.reference).toMatch(/^KIANJA-[0-9A-F]{12}$/);
      expect(appel.urlRetour).toContain('https://kianja.test/tableau-de-bord/paiements?retour=papi&ref=');
      expect(appel.urlNotification).toBe('https://api.kianja.test/paiements/webhook/papi');

      expect(t).toMatchObject({
        provider: 'papi',
        methode: MethodePaiement.PAPI,
        providerCorrelationId: 'pay_9',
        lienPaiement: 'https://pay.papi.test/9',
        statut: StatutTransaction.EN_ATTENTE,
        montant: 75000,
      });
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('ne cree aucune transaction locale si Papi refuse', async () => {
      const { service, papi, repo } = creer();
      papi.creerPaiement.mockRejectedValue(new Error('refuse'));
      await expect(appeler(service)).rejects.toThrow(ServiceUnavailableException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('traduit la contrainte d\'unicite en 409', async () => {
      const { service, papi, repo } = creer();
      papi.creerPaiement.mockResolvedValue({
        idFournisseur: 'pay_9',
        lienPaiement: 'https://pay.papi.test/9',
        statut: 'pending',
      });
      const { QueryFailedError } = await import('typeorm');
      const err = new QueryFailedError('insert', [], Object.assign(new Error('dup'), { code: '23505' }));
      Object.assign(err, { code: '23505' });
      repo.save.mockRejectedValue(err);
      await expect(appeler(service)).rejects.toThrow(ConflictException);
    });
  });
});

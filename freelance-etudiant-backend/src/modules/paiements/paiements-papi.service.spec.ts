import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PaiementsService } from './paiements.service';
import { PapiError } from './papi.service';
import { MethodePaiement, StatutTransaction } from '../../common/enums/statut-transaction.enum';
import type { Transaction } from './entities/transaction.entity';

function creer(options: { diagnosticOk?: boolean } = {}) {
  const ordre: string[] = [];
  const repo = {
    findOne: jest.fn(),
    save: jest.fn((t: unknown) => {
      ordre.push('save');
      return Promise.resolve({ id: 't1', ...(t as object) });
    }),
    create: jest.fn((t: unknown) => t),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const papi = {
    diagnostic: jest.fn().mockReturnValue(
      options.diagnosticOk === false
        ? { ok: false, problemes: ['PAPI_API_KEY absente'] }
        : { ok: true, problemes: [] },
    ),
    creerPaiement: jest.fn((..._a: unknown[]) => {
      ordre.push('papi');
      return Promise.resolve({
        lienPaiement: 'https://pay.papi.mg/l/abc',
        referencePapi: 'PAPI-REF-1',
        devise: 'MGA',
      });
    }),
    verifierStatut: jest.fn(),
  };
  const mvola = { estConfigure: true, verifierStatut: jest.fn(), initierPaiement: jest.fn() };
  const config = {
    get: (k: string) =>
      ({ FRONTEND_URL: 'https://kianja.test/', API_PUBLIC_URL: 'https://api.kianja.test/api/v1' })[k],
  };
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
  return { service, repo, papi, mvola, notifications, email, ordre };
}

function transaction(extra: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    statut: StatutTransaction.EN_ATTENTE,
    provider: 'papi',
    providerCorrelationId: 'PAPI-REF-1',
    reference: 'KIANJA-1',
    montant: 75000,
    methode: MethodePaiement.PAPI,
    ...extra,
  } as Transaction;
}

const candidature = (nomClient: string | null = 'Jean Rakoto') => ({
  mission: {
    titre: 'Site vitrine',
    client: { utilisateur: nomClient === null ? undefined : { nom: nomClient } },
  },
  etudiant: { utilisateurId: 'e1', utilisateur: { nom: 'Rasoa' } },
});

type Appel = (...a: unknown[]) => Promise<Transaction>;
const appeler = (s: PaiementsService, cand = candidature(), existante: Transaction | null = null) =>
  (s as unknown as { creerPaiementPapi: Appel }).creerPaiementPapi(
    cand,
    'cand1',
    'c1',
    75000,
    {},
    undefined,
    existante,
  );

describe('PaiementsService — creation Papi', () => {
  it('enregistre la transaction AVANT d\'appeler Papi, puis le lien', async () => {
    const { service, repo, papi, ordre } = creer();
    const t = await appeler(service);

    expect(ordre).toEqual(['save', 'papi']);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'papi',
        methode: MethodePaiement.PAPI,
        statut: StatutTransaction.EN_ATTENTE,
        montant: 75000,
      }),
    );
    // Le lien est enregistre par une mise a jour ciblee, sans toucher au statut.
    expect(repo.update).toHaveBeenCalledWith(
      { id: 't1', statut: StatutTransaction.EN_ATTENTE },
      {
        providerCorrelationId: 'PAPI-REF-1',
        lienPaiement: 'https://pay.papi.mg/l/abc',
        providerStatut: 'pending',
      },
    );
    expect(t).toMatchObject({
      providerCorrelationId: 'PAPI-REF-1',
      lienPaiement: 'https://pay.papi.mg/l/abc',
    });

    const appel = (papi.creerPaiement.mock.calls[0] as [Record<string, unknown>])[0];
    expect(appel.montantAr).toBe(75000);
    expect(appel.nomClient).toBe('Jean Rakoto'); // mission.client.utilisateur.nom
    expect(String(appel.reference)).toMatch(/^KIANJA-[0-9A-F]{12}$/);
    const retour = `https://kianja.test/tableau-de-bord/paiements?retour=papi&ref=${String(appel.reference)}`;
    expect(appel.urlSucces).toBe(`${retour}&resultat=succes`);
    expect(appel.urlEchec).toBe(`${retour}&resultat=echec`);
    expect(appel.urlNotification).toBe('https://api.kianja.test/api/v1/paiements/webhook/papi');
  });

  it('notifie l\'etudiant une seule fois a la creation', async () => {
    const { service, notifications, email } = creer();
    await appeler(service);
    expect(notifications.creer).toHaveBeenCalledTimes(1);
    expect(email.envoyerPaiementInitie).toHaveBeenCalledTimes(1);
  });

  it('configuration invalide : 503, aucune transaction, aucun appel Papi', async () => {
    const { service, repo, papi } = creer({ diagnosticOk: false });
    await expect(appeler(service)).rejects.toThrow(ServiceUnavailableException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(papi.creerPaiement).not.toHaveBeenCalled();
  });

  it('11. nom du client introuvable : 400, aucune transaction, aucun appel', async () => {
    for (const nom of [null, '  ']) {
      const { service, repo, papi } = creer();
      await expect(appeler(service, candidature(nom))).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
      expect(papi.creerPaiement).not.toHaveBeenCalled();
    }
  });

  it('10. montant invalide : 400 avant toute ecriture', async () => {
    const { service, repo, papi } = creer();
    await expect(
      (service as unknown as { creerPaiementPapi: Appel }).creerPaiementPapi(
        candidature(),
        'cand1',
        'c1',
        0,
        {},
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
    expect(papi.creerPaiement).not.toHaveBeenCalled();
  });

  it('creation concurrente (23505) : 409, Papi jamais appele', async () => {
    const { service, repo, papi } = creer();
    const err = Object.assign(new QueryFailedError('insert', [], new Error('dup')), { code: '23505' });
    repo.save.mockRejectedValue(err);
    await expect(appeler(service)).rejects.toThrow(ConflictException);
    expect(papi.creerPaiement).not.toHaveBeenCalled();
  });

  it('4xx de Papi : refus definitif, transaction ANNULEE (creneau libere), aucune notification', async () => {
    const { service, repo, papi, notifications, email } = creer();
    papi.creerPaiement.mockRejectedValue(
      new PapiError('http', 'HTTP 422', { statutHttp: 422, refusDefinitif: true }),
    );
    await expect(appeler(service)).rejects.toThrow(/refuse la transaction/);
    expect(repo.update).toHaveBeenCalledWith(
      { id: 't1', statut: StatutTransaction.EN_ATTENTE },
      { statut: StatutTransaction.ANNULEE, providerStatut: 'refuse_par_papi' },
    );
    expect(notifications.creer).not.toHaveBeenCalled();
    expect(email.envoyerPaiementInitie).not.toHaveBeenCalled();
  });

  it.each([
    ['5xx', new PapiError('http', 'HTTP 503', { statutHttp: 503 })],
    ['timeout / reseau', new PapiError('reseau', 'Delai depasse')],
    ['reponse mal formee', new PapiError('reponse_invalide', 'sans lien')],
    ['erreur inconnue', new Error('boom')],
  ])('%s : resultat INCERTAIN, la transaction n\'est jamais annulee', async (_nom, erreur) => {
    const { service, repo, papi, notifications } = creer();
    papi.creerPaiement.mockRejectedValue(erreur);
    await expect(appeler(service)).rejects.toThrow(ServiceUnavailableException);

    const misesAJour = repo.update.mock.calls.map((c) => c[1] as Record<string, unknown>);
    expect(misesAJour).toContainEqual({ providerStatut: 'creation_incertaine' });
    expect(misesAJour.some((m) => m.statut === StatutTransaction.ANNULEE)).toBe(false);
    expect(papi.creerPaiement).toHaveBeenCalledTimes(1); // pas de nouvelle tentative aveugle
    expect(notifications.creer).not.toHaveBeenCalled();
  });

  it('16. echec de sauvegarde apres creation Papi : 503, erreur a reconcilier, aucune notification', async () => {
    const { service, repo, notifications, email } = creer();
    repo.update.mockRejectedValue(new Error('connexion perdue'));
    await expect(appeler(service)).rejects.toThrow(/enregistrement a echoue/);
    expect(notifications.creer).not.toHaveBeenCalled();
    expect(email.envoyerPaiementInitie).not.toHaveBeenCalled();
  });

  describe('reprise d\'un paiement en attente', () => {
    it('avec lien : le meme lien est renvoye, Papi non rappele, aucune notification', async () => {
      const { service, repo, papi, notifications } = creer();
      const existante = transaction({ lienPaiement: 'https://pay.papi.mg/l/abc' });
      await expect(appeler(service, candidature(), existante)).resolves.toBe(existante);
      expect(papi.creerPaiement).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
      expect(notifications.creer).not.toHaveBeenCalled();
    });

    it('sans lien (creation incertaine) : meme reference reutilisee, pas de nouvelle transaction', async () => {
      const { service, repo, papi, notifications } = creer();
      const existante = transaction({ providerCorrelationId: null, lienPaiement: null, reference: 'KIANJA-OLD' });
      await appeler(service, candidature(), existante);
      expect(repo.save).not.toHaveBeenCalled();
      const appel = (papi.creerPaiement.mock.calls[0] as [Record<string, unknown>])[0];
      expect(appel.reference).toBe('KIANJA-OLD');
      expect(repo.update).toHaveBeenCalledWith(
        { id: 't1', statut: StatutTransaction.EN_ATTENTE },
        expect.objectContaining({ lienPaiement: 'https://pay.papi.mg/l/abc' }),
      );
      expect(notifications.creer).not.toHaveBeenCalled(); // deja notifie a la 1re creation
    });
  });
});

describe('PaiementsService — verification et webhook Papi', () => {
  describe('traiterWebhook (papi)', () => {
    it('ne croit jamais le statut du corps : relit Papi', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('pending');
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);

      const res = await service.traiterWebhook(
        { merchantPaymentReference: 'KIANJA-1', papiPaymentReference: 'PAPI-REF-1', status: 'paid' },
        'papi',
      );

      expect(papi.verifierStatut).toHaveBeenCalledWith({
        paymentReference: 'PAPI-REF-1',
        reference: 'KIANJA-1',
      });
      expect(confirmer).not.toHaveBeenCalled();
      expect(res).toEqual({ status: 'pending' });
      // pending : mise a jour ciblee, jamais un save complet
      expect(repo.save).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        { id: 't1', statut: StatutTransaction.EN_ATTENTE },
        { providerStatut: 'pending' },
      );
    });

    it('statut contradictoire (corps « paid », Papi « failed ») : annule, ne confirme pas', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('failed');
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);
      const annuler = jest
        .spyOn(service as never, 'marquerAnnulee' as never)
        .mockResolvedValue(undefined as never);
      await expect(
        service.traiterWebhook({ reference: 'KIANJA-1', status: 'paid' }, 'papi'),
      ).resolves.toEqual({ status: 'cancelled' });
      expect(confirmer).not.toHaveBeenCalled();
      expect(annuler).toHaveBeenCalledTimes(1);
    });

    it('confirme quand Papi confirme', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('completed');
      const confirmer = jest
        .spyOn(service as never, 'marquerConfirmee' as never)
        .mockResolvedValue(undefined as never);
      await expect(service.traiterWebhook({ reference: 'KIANJA-1' }, 'papi')).resolves.toEqual({
        status: 'confirmed',
      });
      expect(confirmer).toHaveBeenCalledTimes(1);
    });

    it('14. webhook duplique : le second appel est ignore, une seule confirmation', async () => {
      const { service, repo, papi } = creer();
      papi.verifierStatut.mockResolvedValue('completed');
      const confirmer = jest
        .spyOn(service as never, 'marquerConfirmee' as never)
        .mockResolvedValue(undefined as never);

      repo.findOne.mockResolvedValueOnce(transaction());
      await service.traiterWebhook({ reference: 'KIANJA-1' }, 'papi');

      repo.findOne.mockResolvedValueOnce(transaction({ statut: StatutTransaction.CONFIRMEE }));
      await expect(service.traiterWebhook({ reference: 'KIANJA-1' }, 'papi')).resolves.toEqual({
        status: 'ignored',
      });

      expect(confirmer).toHaveBeenCalledTimes(1);
      expect(papi.verifierStatut).toHaveBeenCalledTimes(1);
    });

    it.each([StatutTransaction.CONFIRMEE, StatutTransaction.LIBEREE, StatutTransaction.ANNULEE])(
      '15. notification tardive sur une transaction %s : ignoree, rien ne change',
      async (statut) => {
        const { service, repo, papi } = creer();
        repo.findOne.mockResolvedValue(transaction({ statut }));
        const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);
        const annuler = jest.spyOn(service as never, 'marquerAnnulee' as never);
        await expect(
          service.traiterWebhook({ reference: 'KIANJA-1', status: 'failed' }, 'papi'),
        ).resolves.toEqual({ status: 'ignored' });
        expect(papi.verifierStatut).not.toHaveBeenCalled();
        expect(confirmer).not.toHaveBeenCalled();
        expect(annuler).not.toHaveBeenCalled();
        expect(repo.update).not.toHaveBeenCalled();
      },
    );

    it('rejette un montant annonce different du montant attendu, sans interroger Papi', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      await expect(
        service.traiterWebhook({ reference: 'KIANJA-1', amount: 100 }, 'papi'),
      ).rejects.toThrow(BadRequestException);
      expect(papi.verifierStatut).not.toHaveBeenCalled();
    });

    it('accepte un montant annonce identique', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('pending');
      await expect(
        service.traiterWebhook({ reference: 'KIANJA-1', amount: '75000' }, 'papi'),
      ).resolves.toEqual({ status: 'pending' });
    });

    it('refuse un webhook Papi visant une transaction MVola ou manuelle', async () => {
      const { service, repo, papi } = creer();
      for (const provider of ['mvola', 'manuel']) {
        repo.findOne.mockResolvedValue(transaction({ provider }));
        await expect(service.traiterWebhook({ reference: 'KIANJA-1' }, 'papi')).rejects.toThrow(
          BadRequestException,
        );
      }
      expect(papi.verifierStatut).not.toHaveBeenCalled();
    });

    it('rejette une notification sans reference, et une transaction inconnue', async () => {
      const { service, repo } = creer();
      await expect(service.traiterWebhook({ status: 'paid' }, 'papi')).rejects.toThrow(
        BadRequestException,
      );
      repo.findOne.mockResolvedValue(null);
      await expect(service.traiterWebhook({ reference: 'inconnue' }, 'papi')).rejects.toThrow(
        /inconnue/,
      );
    });

    it('Papi injoignable : 503 (reessai possible), sans confirmer', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockRejectedValue(new PapiError('reseau', 'timeout'));
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);
      await expect(service.traiterWebhook({ reference: 'KIANJA-1' }, 'papi')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(confirmer).not.toHaveBeenCalled();
    });

    it('PAPI_STATUS_PATH absent : echec ferme (503), jamais de confirmation', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockRejectedValue(new PapiError('configuration', 'PAPI_STATUS_PATH non configure'));
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);
      await expect(service.traiterWebhook({ reference: 'KIANJA-1' }, 'papi')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(confirmer).not.toHaveBeenCalled();
    });
  });

  describe('verifier / confirmer / annuler', () => {
    it('verifier() interroge Papi par reference Papi et reference marchande', async () => {
      const { service, repo, papi, mvola } = creer();
      repo.findOne.mockResolvedValue(transaction({ clientId: 'c1' } as never));
      papi.verifierStatut.mockResolvedValue('pending');
      await service.verifier('t1', 'c1');
      expect(papi.verifierStatut).toHaveBeenCalledWith({
        paymentReference: 'PAPI-REF-1',
        reference: 'KIANJA-1',
      });
      expect(mvola.verifierStatut).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('verifier() fonctionne meme sans reference Papi enregistree (creation incertaine)', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ clientId: 'c1', providerCorrelationId: null } as never));
      papi.verifierStatut.mockResolvedValue('pending');
      await expect(service.verifier('t1', 'c1')).resolves.toBeDefined();
      expect(papi.verifierStatut).toHaveBeenCalledWith({ paymentReference: null, reference: 'KIANJA-1' });
    });

    it('verifier() : echec fournisseur -> 503 propre (pas de trace brute)', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ clientId: 'c1' } as never));
      papi.verifierStatut.mockRejectedValue(new PapiError('http', 'HTTP 500 secret interne'));
      const e = await service.verifier('t1', 'c1').catch((x: Error) => x);
      expect(e).toBeInstanceOf(ServiceUnavailableException);
      expect((e as Error).message).not.toContain('secret interne');
    });

    it('un paiement Papi ne peut etre confirme ni annule a la main', async () => {
      const { service, repo } = creer();
      repo.findOne.mockResolvedValue(transaction());
      await expect(service.confirmer('t1')).rejects.toThrow(/ne peut pas etre confirme/);
      await expect(service.annuler('t1')).rejects.toThrow(/ne peut pas etre annule/);
    });
  });

  it('17. aucun chemin d\'echec ne declenche de notification de paiement reussi', async () => {
    const { service, repo, papi, notifications, email } = creer();
    repo.findOne.mockResolvedValue(transaction());
    papi.verifierStatut.mockResolvedValue('failed');
    await service.traiterWebhook({ reference: 'KIANJA-1' }, 'papi').catch(() => undefined);
    expect(notifications.creer).toHaveBeenCalledTimes(1);
    expect(notifications.creer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'paiement_echoue' }),
    );
    expect(notifications.creer).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'paiement_confirme' }),
    );
    expect(email.envoyerPaiementInitie).not.toHaveBeenCalled();
  });
});

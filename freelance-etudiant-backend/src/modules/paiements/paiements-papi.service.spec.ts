import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PaiementsService } from './paiements.service';
import { PapiError, type EtatPaiementPapi, type StatutFournisseur } from './papi.service';
import { MethodePaiement, StatutTransaction } from './enums/statut-transaction.enum';
import type { Transaction } from './entities/transaction.entity';

/** Relecture Papi coherente avec transaction() (montant, devise, reference). */
function etatDe(
  statut: StatutFournisseur | undefined,
  reference: string,
  extra: Partial<EtatPaiementPapi> = {},
): EtatPaiementPapi {
  const s = statut ?? 'pending';
  return {
    statut: s,
    etat: s === 'completed' ? 'reussi' : s === 'failed' ? 'expire' : 'cree',
    linkStatus: s === 'completed' ? 'PAID' : s === 'failed' ? 'EXPIRED' : 'ACTIVE',
    paymentStatus: s === 'completed' ? 'SUCCESS' : null,
    montant: 75000,
    devise: 'MGA',
    referenceMarchande: reference,
    referencePapi: s === 'completed' ? 'uuid-papi-1' : null,
    methode: s === 'completed' ? 'MVOLA' : null,
    notificationToken: null,
    message: null,
    ...extra,
  };
}

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
    find: jest.fn().mockResolvedValue([]),
  };
  const evenements = { insert: jest.fn().mockResolvedValue({}) };
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
        notificationToken: 'jeton-lien-1',
        devise: 'MGA',
        expiration: new Date('2026-11-05T10:00:00Z'),
      });
    }),
    verifierStatut: jest.fn(),
    // Par defaut : relecture coherente construite a partir de verifierStatut.
    lireStatut: jest.fn(),
    urlNotification: jest.fn(() => 'https://api.kianja.test/api/v1/paiements/webhook/papi'),
  };
  papi.lireStatut.mockImplementation(async (ids: { reference: string; paymentReference?: string | null }) =>
    etatDe(await (papi.verifierStatut(ids) as Promise<StatutFournisseur | undefined>), ids.reference),
  );
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
    evenements as never,
  );
  return { service, repo, papi, mvola, notifications, email, ordre, evenements };
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
        devise: 'MGA',
      }),
    );
    // Le lien est enregistre par une mise a jour ciblee, sans toucher au statut.
    // Aucune « reference Papi » a la creation : Papi renvoie l'echo de la notre.
    expect(repo.update).toHaveBeenCalledWith(
      { id: 't1', statut: StatutTransaction.EN_ATTENTE },
      {
        lienPaiement: 'https://pay.papi.mg/l/abc',
        notificationToken: 'jeton-lien-1',
        dateExpirationLien: new Date('2026-11-05T10:00:00Z'),
        devise: 'MGA',
        providerStatut: 'cree',
      },
    );
    expect(t).toMatchObject({ lienPaiement: 'https://pay.papi.mg/l/abc', providerStatut: 'cree' });
    // Le jeton de notification n'est jamais renvoye au navigateur.
    expect(t.notificationToken).toBeUndefined();

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
    const e = await appeler(service).catch((x: Error) => x);
    expect(e).toBeInstanceOf(BadGatewayException);
    expect((e as Error).message).toMatch(/refuse la transaction/);
    expect(repo.update).toHaveBeenCalledWith(
      { id: 't1', statut: StatutTransaction.EN_ATTENTE },
      { statut: StatutTransaction.ANNULEE, providerStatut: 'refuse_par_papi' },
    );
    expect(notifications.creer).not.toHaveBeenCalled();
    expect(email.envoyerPaiementInitie).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 405])(
    'HTTP %i de Papi : defaut de configuration, message « indisponible » (jamais « a refuse la transaction »)',
    async (statut) => {
      const { service, repo, papi } = creer();
      papi.creerPaiement.mockRejectedValue(
        new PapiError('http', `HTTP ${statut}`, { statutHttp: statut, refusDefinitif: true }),
      );
      const erreur = await appeler(service).catch((e: Error) => e);
      expect(erreur).toBeInstanceOf(ServiceUnavailableException);
      expect((erreur as Error).message).toMatch(/n'est pas disponible/);
      expect((erreur as Error).message).not.toMatch(/refuse la transaction/);
      // Rien n'a ete cree chez Papi : le creneau est libere.
      expect(repo.update).toHaveBeenCalledWith(
        { id: 't1', statut: StatutTransaction.EN_ATTENTE },
        { statut: StatutTransaction.ANNULEE, providerStatut: 'refuse_par_papi' },
      );
    },
  );

  it.each([
    ['5xx', new PapiError('http', 'HTTP 503', { statutHttp: 503 }), 502],
    ['erreur reseau', new PapiError('reseau', 'Erreur reseau (DNS ENOTFOUND)'), 502],
    ['timeout', new PapiError('reseau', 'Delai depasse', { delaiDepasse: true }), 504],
    ['429', new PapiError('http', 'HTTP 429', { statutHttp: 429 }), 502],
    ['reponse mal formee', new PapiError('reponse_invalide', 'sans lien'), 502],
    ['erreur inconnue', new Error('boom'), 503],
  ])('%s : resultat INCERTAIN, la transaction n\'est jamais annulee', async (_nom, erreur, code) => {
    const { service, repo, papi, notifications } = creer();
    papi.creerPaiement.mockRejectedValue(erreur);
    const e = await appeler(service).catch((x: Error) => x);
    expect(e).toBeInstanceOf(HttpException);
    expect((e as HttpException).getStatus()).toBe(code);

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
    it('avec lien encore actif : l\'etat est relu, le meme lien est renvoye, aucun nouveau lien', async () => {
      const { service, repo, papi, notifications } = creer();
      papi.verifierStatut.mockResolvedValue('pending');
      const existante = transaction({ lienPaiement: 'https://pay.papi.mg/l/abc' });
      await expect(appeler(service, candidature(), existante)).resolves.toBe(existante);
      expect(papi.lireStatut).toHaveBeenCalledWith({ paymentReference: 'PAPI-REF-1', reference: 'KIANJA-1' });
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
        { providerStatut: 'cree' },
      );
    });

    it('statut contradictoire (corps « paid », Papi « failed ») : annule, ne confirme pas', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('failed');
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);
      const annuler = jest
        .spyOn(service as never, 'marquerAnnulee' as never)
        .mockResolvedValue(transaction({ statut: StatutTransaction.ANNULEE }) as never);
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
        .mockResolvedValue(transaction({ statut: StatutTransaction.CONFIRMEE }) as never);
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
        .mockResolvedValue(transaction({ statut: StatutTransaction.CONFIRMEE }) as never);

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

    it('retrouve la transaction par merchantPaymentReference uniquement (paymentReference = UUID Papi, ignore)', async () => {
      const { service, repo, papi } = creer();
      // Notification reelle Papi : `paymentReference` est l'UUID Papi, pas notre reference.
      await expect(
        service.traiterWebhook({ paymentReference: 'uuid-papi-1', paymentStatus: 'SUCCESS' }, 'papi'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.findOne).not.toHaveBeenCalled();

      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('pending');
      await service.traiterWebhook(
        {
          merchantPaymentReference: 'KIANJA-1',
          paymentReference: 'uuid-papi-1',
          paymentStatus: 'SUCCESS',
        },
        'papi',
      );
      expect(JSON.stringify(repo.findOne.mock.calls[0][0].where)).not.toContain('uuid-papi-1');
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

    it('verifier() : echec fournisseur -> code precis, message propre (pas de trace brute)', async () => {
      const cas: [PapiError, new (...a: never[]) => HttpException][] = [
        [new PapiError('http', 'HTTP 500 secret interne', { statutHttp: 500 }), BadGatewayException],
        [new PapiError('reseau', 'Delai depasse', { delaiDepasse: true }), GatewayTimeoutException],
        [new PapiError('authentification', 'cle refusee', { statutHttp: 401 }), ServiceUnavailableException],
        [new PapiError('configuration', 'PAPI_API_KEY absente'), ServiceUnavailableException],
      ];
      for (const [erreur, attendue] of cas) {
        const { service, repo, papi } = creer();
        repo.findOne.mockResolvedValue(transaction({ clientId: 'c1' } as never));
        papi.verifierStatut.mockRejectedValue(erreur);
        const e = await service.verifier('t1', 'c1').catch((x: Error) => x);
        expect(e).toBeInstanceOf(attendue);
        expect((e as Error).message).not.toContain('secret interne');
      }
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

describe('PaiementsService — fiabilisation Papi', () => {
  const confirmeEspion = (service: PaiementsService) =>
    jest.spyOn(service as never, 'marquerConfirmee' as never).mockResolvedValue(undefined as never);

  describe('controles de coherence avant confirmation', () => {
    it.each([
      ['montant', { montant: 100 }, 'anomalie_montant'],
      ['montant absent', { montant: null }, 'anomalie_montant'],
      ['devise', { devise: 'EUR' }, 'anomalie_devise'],
      ['reference', { referenceMarchande: 'KIANJA-AUTRE' }, 'anomalie_reference'],
      ['jeton', { notificationToken: 'autre-jeton' }, 'anomalie_jeton'],
    ])('PAID+SUCCESS mais %s incoherent : jamais confirme', async (_nom, extra, motif) => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(
        transaction({ clientId: 'c1', notificationToken: 'jeton-lien-1' } as never),
      );
      papi.lireStatut.mockResolvedValue(etatDe('completed', 'KIANJA-1', extra as never));
      const confirmer = confirmeEspion(service);

      const t = await service.verifier('t1', 'c1');

      expect(confirmer).not.toHaveBeenCalled();
      expect(t.statut).toBe(StatutTransaction.EN_ATTENTE);
      expect(repo.update).toHaveBeenCalledWith(
        { id: 't1', statut: StatutTransaction.EN_ATTENTE },
        expect.objectContaining({ providerStatut: motif }),
      );
    });

    it('PAID+SUCCESS coherent : confirme et enregistre l\'UUID Papi et l\'operateur reel', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(
        transaction({ clientId: 'c1', providerCorrelationId: null, notificationToken: 'jeton-lien-1' } as never),
      );
      papi.lireStatut.mockResolvedValue(
        etatDe('completed', 'KIANJA-1', { notificationToken: 'jeton-lien-1', methode: 'ORANGE_MONEY' }),
      );
      const confirmer = confirmeEspion(service);
      await service.verifier('t1', 'c1');
      expect(repo.update).toHaveBeenCalledWith(
        { id: 't1', statut: StatutTransaction.EN_ATTENTE },
        { providerStatut: 'reussi', providerCorrelationId: 'uuid-papi-1', methodeFournisseur: 'ORANGE_MONEY' },
      );
      expect(confirmer).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['ACTIVE + FAILED (le client peut reessayer)', 'tentative_echouee'],
      ['ACTIVE + PENDING', 'en_cours'],
      ['statut inconnu', 'inconnu'],
    ])('%s : reste EN_ATTENTE, ni confirme ni annule', async (_nom, etat) => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ clientId: 'c1' } as never));
      papi.lireStatut.mockResolvedValue({ ...etatDe('pending', 'KIANJA-1'), etat: etat as never });
      const confirmer = confirmeEspion(service);
      const annuler = jest.spyOn(service as never, 'marquerAnnulee' as never);
      const t = await service.verifier('t1', 'c1');
      expect(t.statut).toBe(StatutTransaction.EN_ATTENTE);
      expect(confirmer).not.toHaveBeenCalled();
      expect(annuler).not.toHaveBeenCalled();
    });
  });

  describe('webhook Papi', () => {
    it('notificationToken different de celui du lien : 401, Papi non relu', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ notificationToken: 'jeton-lien-1' } as never));
      await expect(
        service.traiterWebhook(
          { merchantPaymentReference: 'KIANJA-1', notificationToken: 'forge' },
          'papi',
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(papi.lireStatut).not.toHaveBeenCalled();
    });

    it('notificationToken absent alors qu\'un jeton est connu : 401', async () => {
      const { service, repo } = creer();
      repo.findOne.mockResolvedValue(transaction({ notificationToken: 'jeton-lien-1' } as never));
      await expect(
        service.traiterWebhook({ merchantPaymentReference: 'KIANJA-1' }, 'papi'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('bon jeton + Papi confirme : confirmed', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ notificationToken: 'jeton-lien-1' } as never));
      papi.lireStatut.mockResolvedValue(
        etatDe('completed', 'KIANJA-1', { notificationToken: 'jeton-lien-1' }),
      );
      jest
        .spyOn(service as never, 'marquerConfirmee' as never)
        .mockResolvedValue(transaction({ statut: StatutTransaction.CONFIRMEE }) as never);
      await expect(
        service.traiterWebhook(
          {
            merchantPaymentReference: 'KIANJA-1',
            notificationToken: 'jeton-lien-1',
            paymentStatus: 'SUCCESS',
            amount: 75000,
            currency: 'MGA',
          },
          'papi',
        ),
      ).resolves.toEqual({ status: 'confirmed' });
    });

    it('devise annoncee autre que MGA : 400, Papi non relu', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      await expect(
        service.traiterWebhook({ merchantPaymentReference: 'KIANJA-1', currency: 'EUR' }, 'papi'),
      ).rejects.toThrow(/Devise/);
      expect(papi.lireStatut).not.toHaveBeenCalled();
    });

    it('relecture incoherente (montant) : 2xx « anomaly », jamais confirme', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.lireStatut.mockResolvedValue(etatDe('completed', 'KIANJA-1', { montant: 1 }));
      const confirmer = jest.spyOn(service as never, 'marquerConfirmee' as never);
      await expect(
        service.traiterWebhook({ merchantPaymentReference: 'KIANJA-1' }, 'papi'),
      ).resolves.toEqual({ status: 'anomaly' });
      expect(confirmer).not.toHaveBeenCalled();
    });

    it('ne cherche que parmi les transactions Papi', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('pending');
      await service.traiterWebhook({ merchantPaymentReference: 'KIANJA-1' }, 'papi');
      expect(repo.findOne.mock.calls[0][0].where).toEqual({ reference: 'KIANJA-1', provider: 'papi' });
    });

    it('journalise chaque notification avec son issue, sans jeton ni signature', async () => {
      const { service, repo, papi, evenements } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('pending');
      await service.traiterWebhook(
        { merchantPaymentReference: 'KIANJA-1', paymentReference: 'uuid-1', paymentStatus: 'PENDING', amount: 75000 },
        'papi',
      );
      expect(evenements.insert).toHaveBeenLastCalledWith({
        fournisseur: 'papi',
        reference: 'KIANJA-1',
        referenceFournisseur: 'uuid-1',
        transactionId: 't1',
        statutAnnonce: 'PENDING',
        montantAnnonce: '75000',
        resultat: 'pending',
        codeHttp: 201,
      });

      repo.findOne.mockResolvedValue(null);
      await service
        .traiterWebhook({ merchantPaymentReference: 'KIANJA-X', notificationToken: 'secret-ne-pas-stocker' }, 'papi')
        .catch(() => undefined);
      const dernier = evenements.insert.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(dernier).toMatchObject({ resultat: 'rejet:Transaction inconnue', codeHttp: 404 });
      expect(JSON.stringify(dernier)).not.toContain('secret-ne-pas-stocker');
    });

    it('un journal indisponible ne bloque jamais le traitement', async () => {
      const { service, repo, papi, evenements } = creer();
      repo.findOne.mockResolvedValue(transaction());
      papi.verifierStatut.mockResolvedValue('pending');
      evenements.insert.mockRejectedValue(new Error('table absente'));
      await expect(
        service.traiterWebhook({ merchantPaymentReference: 'KIANJA-1' }, 'papi'),
      ).resolves.toEqual({ status: 'pending' });
    });
  });

  describe('reprise et paiements interrompus', () => {
    it('lien expire : ancienne transaction annulee, NOUVELLE reference et nouveau lien', async () => {
      const { service, repo, papi } = creer();
      papi.lireStatut.mockResolvedValue(etatDe('failed', 'KIANJA-1'));
      const annuler = jest
        .spyOn(service as never, 'marquerAnnulee' as never)
        .mockImplementation(((t: Transaction) =>
          Promise.resolve({ ...t, statut: StatutTransaction.ANNULEE })) as never);
      const existante = transaction({ lienPaiement: 'https://pay.papi.mg/l/vieux' });

      await appeler(service, candidature(), existante);

      expect(annuler).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
      const appel = (papi.creerPaiement.mock.calls[0] as [Record<string, unknown>])[0];
      expect(appel.reference).not.toBe('KIANJA-1');
    });

    it('lien deja paye : confirme, aucun nouveau lien (pas de double paiement)', async () => {
      const { service, papi, repo } = creer();
      papi.lireStatut.mockResolvedValue(etatDe('completed', 'KIANJA-1'));
      const confirmer = jest
        .spyOn(service as never, 'marquerConfirmee' as never)
        .mockResolvedValue(transaction({ statut: StatutTransaction.CONFIRMEE }) as never);
      const t = await appeler(service, candidature(), transaction({ lienPaiement: 'https://pay.papi.mg/l/abc' }));
      expect(confirmer).toHaveBeenCalledTimes(1);
      expect(t.statut).toBe(StatutTransaction.CONFIRMEE);
      expect(papi.creerPaiement).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('relecture impossible pendant la reprise : le lien existant est renvoye, rien de cree', async () => {
      const { service, papi, repo } = creer();
      papi.lireStatut.mockRejectedValue(new PapiError('reseau', 'Delai depasse', { delaiDepasse: true }));
      const existante = transaction({ lienPaiement: 'https://pay.papi.mg/l/abc' });
      await expect(appeler(service, candidature(), existante)).resolves.toBe(existante);
      expect(papi.creerPaiement).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('404 Papi sur une transaction SANS lien : rien n\'a ete cree, annulee', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(transaction({ clientId: 'c1', lienPaiement: null } as never));
      papi.lireStatut.mockRejectedValue(
        new PapiError('introuvable', 'HTTP 404', { statutHttp: 404, refusDefinitif: true }),
      );
      const annuler = jest
        .spyOn(service as never, 'marquerAnnulee' as never)
        .mockResolvedValue(transaction({ statut: StatutTransaction.ANNULEE }) as never);
      await service.verifier('t1', 'c1');
      expect(annuler).toHaveBeenCalledTimes(1);
    });

    it('404 Papi sur une transaction AVEC lien : anomalie, jamais annulee (503)', async () => {
      const { service, repo, papi } = creer();
      repo.findOne.mockResolvedValue(
        transaction({ clientId: 'c1', lienPaiement: 'https://pay.papi.mg/l/abc' } as never),
      );
      papi.lireStatut.mockRejectedValue(
        new PapiError('introuvable', 'HTTP 404', { statutHttp: 404, refusDefinitif: true }),
      );
      const annuler = jest.spyOn(service as never, 'marquerAnnulee' as never);
      await expect(service.verifier('t1', 'c1')).rejects.toThrow(ServiceUnavailableException);
      expect(annuler).not.toHaveBeenCalled();
    });

    it('reconciliation : relit les paiements en attente, s\'arrete sur une panne reseau', async () => {
      const { service, repo, papi } = creer();
      repo.find.mockResolvedValue([
        transaction({ id: 'a', reference: 'KIANJA-A' }),
        transaction({ id: 'b', reference: 'KIANJA-B' }),
        transaction({ id: 'c', reference: 'KIANJA-C' }),
      ]);
      papi.lireStatut
        .mockResolvedValueOnce(etatDe('pending', 'KIANJA-A'))
        .mockRejectedValueOnce(new PapiError('reseau', 'Erreur reseau'));
      await expect(service.reconcilierPapiEnAttente()).resolves.toEqual({ verifiees: 1, erreurs: 1 });
      expect(papi.lireStatut).toHaveBeenCalledTimes(2); // C n'est pas tente
      const filtre = repo.find.mock.calls[0][0].where;
      expect(filtre).toMatchObject({ provider: 'papi', statut: StatutTransaction.EN_ATTENTE });
    });
  });

  describe('creation', () => {
    it('409 PAYMENT_LINK_CONFLICT : 409, creneau libere', async () => {
      const { service, repo, papi } = creer();
      papi.creerPaiement.mockRejectedValue(
        new PapiError('conflit', 'HTTP 409', { statutHttp: 409, refusDefinitif: true, codePapi: 'PAYMENT_LINK_CONFLICT' }),
      );
      await expect(appeler(service)).rejects.toThrow(ConflictException);
      expect(repo.update).toHaveBeenCalledWith(
        { id: 't1', statut: StatutTransaction.EN_ATTENTE },
        { statut: StatutTransaction.ANNULEE, providerStatut: 'conflit_papi' },
      );
    });

    it('cle API refusee : 503 « indisponible », trace cle_papi_refusee', async () => {
      const { service, repo, papi } = creer();
      papi.creerPaiement.mockRejectedValue(
        new PapiError('authentification', 'API key invalide', { statutHttp: 400, refusDefinitif: true }),
      );
      const e = await appeler(service).catch((x: Error) => x);
      expect(e).toBeInstanceOf(ServiceUnavailableException);
      expect(repo.update).toHaveBeenCalledWith(
        { id: 't1', statut: StatutTransaction.EN_ATTENTE },
        { statut: StatutTransaction.ANNULEE, providerStatut: 'cle_papi_refusee' },
      );
    });

    it('operateur choisi (Orange Money) transmis a Papi et enregistre', async () => {
      const { service, repo, papi } = creer();
      await (service as unknown as { creerPaiementPapi: Appel }).creerPaiementPapi(
        candidature(), 'cand1', 'c1', 75000, {}, undefined, null, 'ORANGE_MONEY',
      );
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ methodeFournisseur: 'ORANGE_MONEY' }));
      const appel = (papi.creerPaiement.mock.calls[0] as [Record<string, unknown>])[0];
      expect(appel.fournisseur).toBe('ORANGE_MONEY');
    });
  });
});

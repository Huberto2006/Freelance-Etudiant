import { ConfigService } from '@nestjs/config';
import { PapiError, PapiService } from './papi.service';

function creerService(env: Record<string, string | undefined> = {}) {
  const config = { get: (cle: string) => env[cle] } as unknown as ConfigService;
  return new PapiService(config);
}

const ENV_OK = { PAPI_API_KEY: 'cle_secrete_papi' };

const PARAMS = {
  montantAr: 75000,
  reference: 'KIANJA-ABC123456789',
  nomClient: 'Jean Rakoto',
  description: 'Paiement mission "Site vitrine" - KIANJA',
  urlSucces: 'https://kianja.test/retour?ok=1',
  urlEchec: 'https://kianja.test/retour?ok=0',
  urlNotification: 'https://api.kianja.test/api/v1/paiements/webhook/papi',
};

const REPONSE_OK = {
  data: {
    paymentLink: 'https://pay.papi.mg/l/abc',
    paymentReference: 'PAPI-REF-1',
    currency: 'MGA',
    amount: 75000,
  },
};

function reponse(corps: unknown, statut = 200) {
  return {
    ok: statut >= 200 && statut < 300,
    status: statut,
    text: () => Promise.resolve(typeof corps === 'string' ? corps : JSON.stringify(corps)),
  } as Response;
}

async function erreurDe(promesse: Promise<unknown>): Promise<PapiError> {
  try {
    await promesse;
  } catch (e) {
    expect(e).toBeInstanceOf(PapiError);
    return e as PapiError;
  }
  throw new Error("Une PapiError etait attendue");
}

describe('PapiService', () => {
  const fetchOriginal = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  describe('configuration', () => {
    it('1. valide avec la seule cle API (URL de base officielle par defaut)', () => {
      const s = creerService(ENV_OK);
      expect(s.estConfigure).toBe(true);
      expect(s.diagnostic()).toEqual({ ok: true, problemes: [] });
      expect(s.verificationDisponible).toBe(true); // chemin de statut officiel par defaut
    });

    it('2a. cle absente : diagnostic sans secret, aucun appel emis', async () => {
      const s = creerService({});
      expect(s.estConfigure).toBe(false);
      expect(s.diagnostic().problemes).toEqual(['PAPI_API_KEY absente']);
      const e = await erreurDe(s.creerPaiement(PARAMS));
      expect(e.nature).toBe('configuration');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('2b. URL de base invalide ou non https', () => {
      expect(creerService({ ...ENV_OK, PAPI_BASE_URL: 'http://papi.test' }).estConfigure).toBe(false);
      expect(creerService({ ...ENV_OK, PAPI_BASE_URL: 'pas un url' }).estConfigure).toBe(false);
    });

    it('2c. en production, FRONTEND_URL / API_PUBLIC_URL doivent etre https publics', () => {
      const base = { ...ENV_OK, NODE_ENV: 'production' };
      const s1 = creerService({ ...base, FRONTEND_URL: 'http://localhost:3001', API_PUBLIC_URL: 'https://api.kianja.mg' });
      expect(s1.diagnostic().problemes).toEqual([
        'FRONTEND_URL doit etre une URL https publique en production',
      ]);
      const s2 = creerService({ ...base, FRONTEND_URL: 'https://kianja.mg' });
      expect(s2.diagnostic().problemes).toEqual([
        'API_PUBLIC_URL doit etre une URL https publique en production',
      ]);
      expect(
        creerService({ ...base, FRONTEND_URL: 'https://kianja.mg', API_PUBLIC_URL: 'https://api.kianja.mg' }).estConfigure,
      ).toBe(true);
    });

    it('le diagnostic ne contient jamais la cle API', () => {
      const s = creerService({ PAPI_API_KEY: 'cle_secrete_papi', PAPI_BASE_URL: 'http://x.test' });
      expect(JSON.stringify(s.diagnostic())).not.toContain('cle_secrete_papi');
    });
  });

  describe('creation du lien', () => {
    it('3. appelle POST /payment-links avec l\'en-tete Token et les champs exacts', async () => {
      fetchMock.mockResolvedValue(reponse(REPONSE_OK));

      const res = await creerService(ENV_OK).creerPaiement(PARAMS);

      expect(res).toEqual({
        lienPaiement: 'https://pay.papi.mg/l/abc',
        referencePapi: 'PAPI-REF-1',
        devise: 'MGA',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://app.papi.mg/engine/api/payment-links');
      expect(init.method).toBe('POST');

      const entetes = init.headers as Record<string, string>;
      expect(entetes.Token).toBe('cle_secrete_papi'); // sans prefixe Bearer
      expect(entetes.Authorization).toBeUndefined();
      expect(entetes['Content-Type']).toBe('application/json');

      expect(JSON.parse(init.body as string)).toEqual({
        amount: 75000,
        reference: 'KIANJA-ABC123456789',
        clientName: 'Jean Rakoto',
        description: 'Paiement mission "Site vitrine" - KIANJA',
        successUrl: 'https://kianja.test/retour?ok=1',
        failureUrl: 'https://kianja.test/retour?ok=0',
        notificationUrl: 'https://api.kianja.test/api/v1/paiements/webhook/papi',
      });
    });

    it('n\'envoie pas notificationUrl si absente, et tronque nom et description', async () => {
      fetchMock.mockResolvedValue(reponse(REPONSE_OK));
      await creerService(ENV_OK).creerPaiement({
        ...PARAMS,
        urlNotification: undefined,
        nomClient: 'N'.repeat(300),
        description: 'D'.repeat(600),
      });
      const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as Record<string, string>;
      expect('notificationUrl' in corps).toBe(false);
      expect(corps.clientName).toHaveLength(100);
      expect(corps.description).toHaveLength(255);
    });

    it('respecte les surcharges d\'URL, de chemin et d\'en-tete', async () => {
      fetchMock.mockResolvedValue(reponse(REPONSE_OK));
      await creerService({
        ...ENV_OK,
        PAPI_BASE_URL: 'https://sandbox.papi.test/api/',
        PAPI_CREATE_PATH: '/v2/liens',
        PAPI_AUTH_HEADER: 'X-Token',
        PAPI_AUTH_SCHEME: 'Key',
      }).creerPaiement(PARAMS);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://sandbox.papi.test/api/v2/liens');
      expect((init.headers as Record<string, string>)['X-Token']).toBe('Key cle_secrete_papi');
    });

    it('contrat officiel par defaut : POST /payment-links avec la cle brute dans l\'en-tete Token', async () => {
      fetchMock.mockResolvedValue(reponse(REPONSE_OK));
      await creerService(ENV_OK).creerPaiement(PARAMS);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://app.papi.mg/engine/api/payment-links');
      expect(init.method).toBe('POST');
      const entetes = init.headers as Record<string, string>;
      expect(entetes.Token).toBe('cle_secrete_papi');
      expect(entetes.Authorization).toBeUndefined();
    });

    it.each([
      [401, /authentification refusee/],
      [403, /authentification refusee/],
      [404, /URL ou chemin introuvable/],
      [405, /URL ou chemin introuvable/],
    ])('HTTP %i : cause de configuration signalee et configurationProbable', async (statut, motif) => {
      fetchMock.mockResolvedValue(reponse({ message: 'detail interne' }, statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.configurationProbable).toBe(true);
      expect(e.message).toMatch(motif);
      expect(e.message).not.toContain('cle_secrete_papi');
    });

    it.each([400, 409, 422])('HTTP %i : refus de la requete, pas un defaut de configuration', async (statut) => {
      fetchMock.mockResolvedValue(reponse({ error: { code: 'VALIDATION_ERROR' } }, statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.configurationProbable).toBe(false);
      expect(e.refusDefinitif).toBe(true);
    });

    it('montant inferieur au minimum Papi (300 Ar) : parametres, aucun appel', async () => {
      const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, montantAr: 299 }));
      expect(e.nature).toBe('parametres');
      expect(e.message).toMatch(/300/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([400, 401, 403, 404, 422])('4. HTTP %i : refus definitif', async (statut) => {
      fetchMock.mockResolvedValue(reponse({ message: 'detail interne' }, statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('http');
      expect(e.statutHttp).toBe(statut);
      expect(e.refusDefinitif).toBe(true);
      expect(e.message).not.toContain('detail interne');
      expect(e.message).not.toContain('cle_secrete_papi');
    });

    it.each([408, 429])('4b. HTTP %i : incertain (jamais definitif)', async (statut) => {
      fetchMock.mockResolvedValue(reponse('', statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.refusDefinitif).toBe(false);
    });

    it.each([500, 502, 503])('5. HTTP %i : resultat incertain', async (statut) => {
      fetchMock.mockResolvedValue(reponse('boom', statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('http');
      expect(e.refusDefinitif).toBe(false);
    });

    it('6a. erreur reseau : incertain', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('reseau');
      expect(e.refusDefinitif).toBe(false);
    });

    it('6b. timeout : la requete est abandonnee apres PAPI_TIMEOUT_MS', async () => {
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }),
      );
      const e = await erreurDe(
        creerService({ ...ENV_OK, PAPI_TIMEOUT_MS: '20' }).creerPaiement(PARAMS),
      );
      expect(e.nature).toBe('reseau');
      expect(e.message).toMatch(/Delai depasse \(20 ms\)/);
      expect(e.refusDefinitif).toBe(false);
    });

    it('7. JSON invalide (HTTP 200) : reponse_invalide, incertain', async () => {
      fetchMock.mockResolvedValue(reponse('<html>pas du json</html>'));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('reponse_invalide');
      expect(e.refusDefinitif).toBe(false);
    });

    it.each([
      ['sans objet data', { ok: true }],
      ['data non objet', { data: 'x' }],
      ['8. sans lien de paiement', { data: { paymentReference: 'P1' } }],
      ['9. sans reference marchande Papi', { data: { paymentLink: 'https://pay.papi.mg/l/x' } }],
      ['lien non https', { data: { paymentLink: 'http://evil.test/x', paymentReference: 'P1' } }],
      ['lien invalide', { data: { paymentLink: 'pas un url', paymentReference: 'P1' } }],
      ['ancien format (id / paymentUrl) non accepte', { id: 'p1', paymentUrl: 'https://pay.papi.mg/x' }],
    ])('reponse mal formee — %s', async (_nom, corps) => {
      fetchMock.mockResolvedValue(reponse(corps));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('reponse_invalide');
    });

    it('refuse un montant renvoye different du montant demande', async () => {
      fetchMock.mockResolvedValue(
        reponse({ data: { ...REPONSE_OK.data, amount: 1000 } }),
      );
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('reponse_invalide');
      expect(e.message).toMatch(/montant/i);
    });

    it.each([0, -5, NaN, Infinity])('10. montant invalide (%s) : aucun appel', async (montantAr) => {
      const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, montantAr }));
      expect(e.nature).toBe('parametres');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(['', '   '])('11. nom du client manquant (%j) : aucun appel', async (nomClient) => {
      const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, nomClient }));
      expect(e.nature).toBe('parametres');
      expect(e.message).toMatch(/clientName/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reference marchande manquante ou trop longue, URL de retour invalide : aucun appel', async () => {
      for (const surcharge of [
        { reference: '' },
        { reference: 'R'.repeat(101) },
        { urlSucces: 'pas un url' },
        { urlEchec: '' },
        { urlNotification: 'ftp://x.test' },
        { description: ' ' },
      ]) {
        const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, ...surcharge }));
        expect(e.nature).toBe('parametres');
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('ne rejoue jamais automatiquement la creation', async () => {
      fetchMock.mockResolvedValue(reponse('boom', 503));
      await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('verification du statut', () => {
    const ENV_STATUT = { ...ENV_OK, PAPI_STATUS_PATH: '/payments/{paymentReference}' };

    it('12. defaut officiel : GET /payment-links/{reference marchande} avec l\'en-tete Token, PAID+SUCCESS = completed', async () => {
      fetchMock.mockResolvedValue(
        reponse({ data: { linkStatus: 'PAID', paymentStatus: 'SUCCESS' } }),
      );
      const s = await creerService(ENV_OK).verifierStatut({
        paymentReference: 'UUID-PAPI',
        reference: 'KIANJA-1',
      });
      expect(s).toBe('completed');
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://app.papi.mg/engine/api/payment-links/KIANJA-1');
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Token).toBe('cle_secrete_papi');
    });

    it('chemin de statut avec parametre non pris en charge ({id}) : echec ferme sans appel', async () => {
      const e = await erreurDe(
        creerService({ ...ENV_OK, PAPI_STATUS_PATH: '/payments/{id}' }).verifierStatut({
          paymentReference: 'P1',
          reference: 'KIANJA-1',
        }),
      );
      expect(e.nature).toBe('configuration');
      expect(e.message).toMatch(/\{id\}/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('accepte le placeholder {reference} (reference marchande Kianja)', async () => {
      fetchMock.mockResolvedValue(reponse({ linkStatus: 'ACTIVE', paymentStatus: null }));
      await creerService({ ...ENV_OK, PAPI_STATUS_PATH: '/links/{reference}/status' }).verifierStatut({
        reference: 'KIANJA-1',
      });
      expect((fetchMock.mock.calls[0] as [string])[0]).toBe(
        'https://app.papi.mg/engine/api/links/KIANJA-1/status',
      );
    });

    it.each([
      ['PAID', 'SUCCESS', 'completed'],
      ['paid', 'success', 'completed'],
      ['PAID', 'PENDING', 'pending'],
      ['PAID', null, 'pending'],
      ['ACTIVE', 'SUCCESS', 'pending'],
      ['ACTIVE', null, 'pending'],
      ['ACTIVE', 'PENDING', 'pending'],
      ['ACTIVE', 'FAILED', 'pending'], // lien reutilisable : jamais annule
      ['EXPIRED', null, 'failed'],
      ['EXPIRED', 'FAILED', 'failed'],
      ['DISABLED', 'FAILED', 'failed'],
      ['QUELQUE_CHOSE', 'SUCCESS', 'pending'],
      [undefined, undefined, 'pending'],
      [42, 'SUCCESS', 'pending'],
    ])('linkStatus %p / paymentStatus %p -> %s (seul PAID+SUCCESS confirme)', async (lien, paiement, attendu) => {
      fetchMock.mockResolvedValue(
        reponse({ linkStatus: lien, paymentStatus: paiement, status: 'SUCCESS' }),
      );
      await expect(
        creerService(ENV_STATUT).verifierStatut({ paymentReference: 'p', reference: 'r' }),
      ).resolves.toBe(attendu);
    });

    it('ignore un ancien champ `status` : sans linkStatus/paymentStatus, jamais confirme', async () => {
      fetchMock.mockResolvedValue(reponse({ data: { status: 'PAID' } }));
      await expect(
        creerService(ENV_STATUT).verifierStatut({ paymentReference: 'p', reference: 'r' }),
      ).resolves.toBe('pending');
    });

    it('propage une erreur HTTP, un JSON invalide et une erreur reseau', async () => {
      const s = creerService(ENV_STATUT);
      fetchMock.mockResolvedValueOnce(reponse('x', 500));
      expect((await erreurDe(s.verifierStatut({ reference: 'r' }))).nature).toBe('http');
      fetchMock.mockResolvedValueOnce(reponse('pas json'));
      expect((await erreurDe(s.verifierStatut({ reference: 'r' }))).nature).toBe('reponse_invalide');
      fetchMock.mockRejectedValueOnce(new Error('down'));
      expect((await erreurDe(s.verifierStatut({ reference: 'r' }))).nature).toBe('reseau');
    });
  });
});

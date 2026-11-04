import { ConfigService } from '@nestjs/config';
import { PapiError, PapiService } from './papi.service';

/**
 * Contrat teste : docs.papi.mg (Payment link API, consultee le 2026-11-04).
 * Les corps de reponse et d'erreur ci-dessous reprennent les exemples
 * officiels de la documentation.
 */

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
  urlNotification: 'https://kianja.test/api/v1/paiements/webhook/papi',
};

/** Reponse 200 documentee : `paymentReference` = echo de NOTRE reference. */
const REPONSE_OK = {
  data: {
    amount: 75000.0,
    currency: 'MGA',
    displayCurrency: 'MGA',
    linkCreationDateTime: 1788065989011,
    linkExpirationDateTime: 1788152389011,
    paymentLink: 'https://payment-form.papi.mg/kianja/payments/eyJhbGciOiJIUzI1NiJ9.x',
    clientName: 'Jean Rakoto',
    paymentReference: 'KIANJA-ABC123456789',
    description: 'Paiement mission "Site vitrine" - KIANJA',
    notificationToken: '5b8f0c3e-2a7d-4f61-9e0b-7c4d1a2e9f38',
    shortLink: 'https://link.papi.mg/8NW7R',
  },
};

/** Relecture documentee (GET /payment-links/{merchantPaymentReference}). */
const RELECTURE_PAYEE = {
  data: {
    linkStatus: 'PAID',
    paymentStatus: 'SUCCESS',
    paymentMethod: 'MVOLA',
    currency: 'MGA',
    amount: 75000.0,
    merchantPaymentReference: 'KIANJA-1',
    papiPaymentReference: 'c1f4a5b0-6f5e-4e1b-9f0e-2b7d8a9c3d21',
    notificationToken: '5b8f0c3e-2a7d-4f61-9e0b-7c4d1a2e9f38',
    message: null,
  },
};

const erreurPapi = (code: string, message: string) => ({ error: { code, message } });

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
  throw new Error('Une PapiError etait attendue');
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
      expect(s.diagnostic().problemes).toEqual([]);
    });

    it('2a. cle absente : diagnostic sans secret, aucun appel emis', async () => {
      const s = creerService({});
      expect(s.estConfigure).toBe(false);
      expect(s.diagnostic().problemes).toEqual(['PAPI_API_KEY absente']);
      const e = await erreurDe(s.creerPaiement(PARAMS));
      expect(e.nature).toBe('configuration');
      expect(e.configurationProbable).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('2b. URL de base invalide ou non https', () => {
      expect(creerService({ ...ENV_OK, PAPI_BASE_URL: 'http://papi.test' }).estConfigure).toBe(false);
      expect(creerService({ ...ENV_OK, PAPI_BASE_URL: 'pas un url' }).estConfigure).toBe(false);
    });

    it('2c. devise autre que MGA : bloquant (Papi ne regle que MGA)', () => {
      expect(creerService({ ...ENV_OK, PAPI_CURRENCY: 'EUR' }).diagnostic().problemes).toEqual([
        'PAPI_CURRENCY=EUR : Papi ne regle que MGA',
      ]);
    });

    it('2d. production : FRONTEND_URL http (cause du 503 « Papi n\'est pas disponible »)', () => {
      const s = creerService({ ...ENV_OK, NODE_ENV: 'production', FRONTEND_URL: 'http://kianja.arato.mg' });
      const { problemes } = s.diagnostic();
      expect(problemes).toHaveLength(2);
      expect(problemes[0]).toMatch(/FRONTEND_URL doit etre une URL https publique.*http:\/\/…/);
      expect(problemes[1]).toMatch(/URL de notification non https/);
    });

    it('2e. production : API_PUBLIC_URL absente est deduite de FRONTEND_URL (meme origine)', () => {
      const s = creerService({ ...ENV_OK, NODE_ENV: 'production', FRONTEND_URL: 'https://kianja.arato.mg/' });
      expect(s.estConfigure).toBe(true);
      expect(s.urlNotification()).toBe('https://kianja.arato.mg/api/v1/paiements/webhook/papi');
    });

    it('2f. API_PUBLIC_URL explicite prioritaire ; sans /api/ : avertissement', () => {
      const s = creerService({ ...ENV_OK, FRONTEND_URL: 'https://a.test', API_PUBLIC_URL: 'https://b.test' });
      expect(s.urlNotification()).toBe('https://b.test/paiements/webhook/papi');
      expect(s.diagnostic().avertissements.join(' ')).toMatch(/prefixe \/api\/v1/);
    });

    it('2g. secret webhook absent ou mal copie : avertissement, non bloquant', () => {
      expect(creerService(ENV_OK).diagnostic().avertissements.join(' ')).toMatch(/PAPI_WEBHOOK_SECRET absent/);
      const tronque = creerService({ ...ENV_OK, PAPI_WEBHOOK_SECRET: 'a'.repeat(64) });
      expect(tronque.estConfigure).toBe(true);
      expect(tronque.diagnostic().avertissements.join(' ')).toMatch(/prefixe inclus/);
      const bon = creerService({ ...ENV_OK, PAPI_WEBHOOK_SECRET: `pwhsec_${'a'.repeat(64)}` });
      expect(bon.diagnostic().avertissements).toEqual([]);
    });

    it('le diagnostic et le resume ne contiennent jamais la cle ni le secret', () => {
      const s = creerService({
        PAPI_API_KEY: 'cle_secrete_papi',
        PAPI_WEBHOOK_SECRET: 'pwhsec_secret',
        PAPI_BASE_URL: 'http://x.test',
      });
      const texte = JSON.stringify([s.diagnostic(), s.resumeConfiguration()]);
      expect(texte).not.toContain('cle_secrete_papi');
      expect(texte).not.toContain('pwhsec_secret');
    });
  });

  describe('creation du lien', () => {
    it('3. POST /payment-links, en-tete Token brut, champs documentes', async () => {
      fetchMock.mockResolvedValue(reponse(REPONSE_OK));

      const res = await creerService(ENV_OK).creerPaiement(PARAMS);

      expect(res).toEqual({
        lienPaiement: REPONSE_OK.data.paymentLink,
        notificationToken: '5b8f0c3e-2a7d-4f61-9e0b-7c4d1a2e9f38',
        devise: 'MGA',
        expiration: new Date(1788152389011),
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
        notificationUrl: 'https://kianja.test/api/v1/paiements/webhook/papi',
        currency: 'MGA',
        validDuration: 24,
      });
    });

    it('validDuration configurable et borne a 596 h ; operateur et email transmis', async () => {
      fetchMock.mockResolvedValue(reponse(REPONSE_OK));
      await creerService({ ...ENV_OK, PAPI_LINK_VALIDITY_HOURS: '9999' }).creerPaiement({
        ...PARAMS,
        fournisseur: 'ORANGE_MONEY',
        emailPayeur: 'client@kianja.test',
      });
      const corps = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(corps.validDuration).toBe(596);
      expect(corps.provider).toBe('ORANGE_MONEY');
      expect(corps.payerEmail).toBe('client@kianja.test');
    });

    it.each(['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BRED'])('operateur %s accepte', async (f) => {
      fetchMock.mockResolvedValue(reponse(REPONSE_OK));
      await creerService(ENV_OK).creerPaiement({ ...PARAMS, fournisseur: f as never });
      expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).provider).toBe(f);
    });

    it('operateur inconnu : parametres, aucun appel', async () => {
      const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, fournisseur: 'VISA' as never }));
      expect(e.nature).toBe('parametres');
      expect(fetchMock).not.toHaveBeenCalled();
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
      expect(corps.clientName).toHaveLength(255);
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

    it('400 « API key invalide » (cle absente/inconnue sur la creation) : authentification, pas un refus client', async () => {
      fetchMock.mockResolvedValue(reponse(erreurPapi('CORE_INPUT_400', 'API key invalide'), 400));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('authentification');
      expect(e.configurationProbable).toBe(true);
      expect(e.codePapi).toBe('CORE_INPUT_400');
      expect(e.message).toMatch(/PAPI_API_KEY/);
      expect(e.message).not.toContain('cle_secrete_papi');
    });

    it('401 CORE_PERM_0001 : authentification', async () => {
      fetchMock.mockResolvedValue(reponse(erreurPapi('CORE_PERM_0001', 'API key invalide'), 401));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('authentification');
      expect(e.refusDefinitif).toBe(true);
    });

    it.each([403, 404, 405])('HTTP %i : defaut de configuration probable', async (statut) => {
      fetchMock.mockResolvedValue(reponse('', statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('http');
      expect(e.configurationProbable).toBe(true);
      expect(e.refusDefinitif).toBe(true);
    });

    it('400 de validation : refus definitif, motif Papi conserve pour les logs', async () => {
      fetchMock.mockResolvedValue(
        reponse(erreurPapi('CORE_INPUT_400', 'La description est réquise, Le montant doit être supérieur ou égal à 300.'), 400),
      );
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('http');
      expect(e.configurationProbable).toBe(false);
      expect(e.refusDefinitif).toBe(true);
      expect(e.message).toMatch(/CORE_INPUT_400.*description est réquise/);
    });

    it('409 PAYMENT_LINK_CONFLICT : conflit (rien de cree)', async () => {
      fetchMock.mockResolvedValue(
        reponse(erreurPapi('PAYMENT_LINK_CONFLICT', 'Un lien de paiement actif existe déjà'), 409),
      );
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('conflit');
      expect(e.codePapi).toBe('PAYMENT_LINK_CONFLICT');
      expect(e.refusDefinitif).toBe(true);
      expect(e.configurationProbable).toBe(false);
    });

    it('montant inferieur au minimum Papi (300 Ar) : parametres, aucun appel', async () => {
      const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, montantAr: 299 }));
      expect(e.nature).toBe('parametres');
      expect(e.message).toMatch(/300/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([408, 429])('HTTP %i : incertain (jamais definitif)', async (statut) => {
      fetchMock.mockResolvedValue(reponse('', statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.refusDefinitif).toBe(false);
    });

    it.each([500, 502, 503])('HTTP %i : resultat incertain', async (statut) => {
      fetchMock.mockResolvedValue(reponse(erreurPapi('ENGINE_UNAVAILABLE', 'Indisponible'), statut));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('http');
      expect(e.refusDefinitif).toBe(false);
      expect(e.configurationProbable).toBe(false);
      expect(e.message).toMatch(new RegExp(`HTTP ${statut}`));
    });

    it.each([
      ['ENOTFOUND', 'DNS'],
      ['CERT_HAS_EXPIRED', 'TLS'],
      ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'TLS'],
      ['ECONNREFUSED', 'connexion'],
      ['ECONNRESET', 'connexion'],
    ])('erreur reseau %s : cause %s identifiee, incertain', async (code, famille) => {
      fetchMock.mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause: { code } }));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('reseau');
      expect(e.refusDefinitif).toBe(false);
      expect(e.delaiDepasse).toBe(false);
      expect(e.message).toContain(`${famille} ${code}`);
    });

    it('timeout : la requete est abandonnee apres PAPI_TIMEOUT_MS', async () => {
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
      expect(e.delaiDepasse).toBe(true);
      expect(e.message).toMatch(/Delai depasse \(20 ms\)/);
      expect(e.refusDefinitif).toBe(false);
    });

    it('JSON invalide (HTTP 200) : reponse_invalide, incertain', async () => {
      fetchMock.mockResolvedValue(reponse('<html>pas du json</html>'));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('reponse_invalide');
      expect(e.refusDefinitif).toBe(false);
    });

    it.each([
      ['sans objet data', { ok: true }],
      ['data non objet', { data: 'x' }],
      ['sans lien de paiement', { data: { paymentReference: PARAMS.reference } }],
      ['lien non https', { data: { paymentLink: 'http://evil.test/x' } }],
      ['lien invalide', { data: { paymentLink: 'pas un url' } }],
      ['reference renvoyee differente', { data: { ...REPONSE_OK.data, paymentReference: 'AUTRE' } }],
      ['devise renvoyee differente', { data: { ...REPONSE_OK.data, currency: 'EUR' } }],
      ['montant renvoye different', { data: { ...REPONSE_OK.data, amount: 1000 } }],
      ['ancien format (id / paymentUrl) non accepte', { id: 'p1', paymentUrl: 'https://pay.papi.mg/x' }],
    ])('reponse mal formee — %s', async (_nom, corps) => {
      fetchMock.mockResolvedValue(reponse(corps));
      const e = await erreurDe(creerService(ENV_OK).creerPaiement(PARAMS));
      expect(e.nature).toBe('reponse_invalide');
    });

    it('accepte 75000.0 renvoye pour 75000 demande', async () => {
      fetchMock.mockResolvedValue(reponse({ data: { ...REPONSE_OK.data, amount: 75000.0 } }));
      await expect(creerService(ENV_OK).creerPaiement(PARAMS)).resolves.toBeDefined();
    });

    it.each([0, -5, NaN, Infinity])('montant invalide (%s) : aucun appel', async (montantAr) => {
      const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, montantAr }));
      expect(e.nature).toBe('parametres');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(['', '   '])('nom du client manquant (%j) : aucun appel', async (nomClient) => {
      const e = await erreurDe(creerService(ENV_OK).creerPaiement({ ...PARAMS, nomClient }));
      expect(e.nature).toBe('parametres');
      expect(e.message).toMatch(/clientName/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reference manquante, trop longue ou non relisible, URL invalide : aucun appel', async () => {
      for (const surcharge of [
        { reference: '' },
        { reference: 'R'.repeat(101) },
        { reference: 'KIANJA/1' }, // un « / » rend la relecture impossible (doc)
        { reference: 'KIANJA 1' },
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

  describe('relecture du statut', () => {
    it('GET /payment-links/{reference marchande}, en-tete Token, champs documentes', async () => {
      fetchMock.mockResolvedValue(reponse(RELECTURE_PAYEE));
      const etat = await creerService(ENV_OK).lireStatut({ paymentReference: null, reference: 'KIANJA-1' });
      expect(etat).toEqual({
        statut: 'completed',
        etat: 'reussi',
        linkStatus: 'PAID',
        paymentStatus: 'SUCCESS',
        montant: 75000,
        devise: 'MGA',
        referenceMarchande: 'KIANJA-1',
        referencePapi: 'c1f4a5b0-6f5e-4e1b-9f0e-2b7d8a9c3d21',
        methode: 'MVOLA',
        notificationToken: '5b8f0c3e-2a7d-4f61-9e0b-7c4d1a2e9f38',
        message: null,
      });
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://app.papi.mg/engine/api/payment-links/KIANJA-1');
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).Token).toBe('cle_secrete_papi');
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    });

    it('verifierStatut (compatibilite) renvoie le statut normalise', async () => {
      fetchMock.mockResolvedValue(reponse(RELECTURE_PAYEE));
      await expect(creerService(ENV_OK).verifierStatut({ reference: 'KIANJA-1' })).resolves.toBe('completed');
    });

    it.each([
      ['PAID', 'SUCCESS', 'completed', 'reussi'],
      ['paid', 'success', 'completed', 'reussi'],
      ['PAID', 'PENDING', 'pending', 'inconnu'],
      ['PAID', null, 'pending', 'inconnu'],
      ['ACTIVE', 'SUCCESS', 'pending', 'inconnu'],
      ['ACTIVE', null, 'pending', 'cree'],
      ['ACTIVE', 'PENDING', 'pending', 'en_cours'],
      ['ACTIVE', 'FAILED', 'pending', 'tentative_echouee'], // lien reutilisable : jamais annule
      ['EXPIRED', null, 'failed', 'expire'],
      ['EXPIRED', 'PENDING', 'failed', 'expire'],
      ['DISABLED', 'FAILED', 'failed', 'desactive'],
      ['QUELQUE_CHOSE', 'SUCCESS', 'pending', 'inconnu'],
      [undefined, undefined, 'pending', 'inconnu'],
      [42, 'SUCCESS', 'pending', 'inconnu'],
    ])('linkStatus %p / paymentStatus %p -> %s / %s (seul PAID+SUCCESS confirme)', async (lien, paiement, statut, etat) => {
      fetchMock.mockResolvedValue(reponse({ data: { linkStatus: lien, paymentStatus: paiement, status: 'SUCCESS' } }));
      await expect(creerService(ENV_OK).lireStatut({ reference: 'r' })).resolves.toMatchObject({ statut, etat });
    });

    it('ignore un ancien champ `status` : sans linkStatus/paymentStatus, jamais confirme', async () => {
      fetchMock.mockResolvedValue(reponse({ data: { status: 'PAID' } }));
      await expect(creerService(ENV_OK).verifierStatut({ reference: 'r' })).resolves.toBe('pending');
    });

    it('montant absent : null (le controle de coherence refusera la confirmation)', async () => {
      fetchMock.mockResolvedValue(reponse({ data: { linkStatus: 'PAID', paymentStatus: 'SUCCESS' } }));
      await expect(creerService(ENV_OK).lireStatut({ reference: 'r' })).resolves.toMatchObject({ montant: null });
    });

    it('chemin avec parametre non pris en charge ({id}) : configuration invalide, aucun appel', async () => {
      const s = creerService({ ...ENV_OK, PAPI_STATUS_PATH: '/payments/{id}' });
      expect(s.estConfigure).toBe(false);
      const e = await erreurDe(s.lireStatut({ reference: 'KIANJA-1' }));
      expect(e.nature).toBe('configuration');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('accepte le placeholder {paymentReference}', async () => {
      fetchMock.mockResolvedValue(reponse(RELECTURE_PAYEE));
      await creerService({ ...ENV_OK, PAPI_STATUS_PATH: '/x/{paymentReference}' }).lireStatut({
        paymentReference: 'uuid',
        reference: 'KIANJA-1',
      });
      expect((fetchMock.mock.calls[0] as [string])[0]).toBe('https://app.papi.mg/engine/api/x/uuid');
    });

    it('404 CORE_404 : introuvable ; 401 CORE_PERM_0001 : authentification', async () => {
      const s = creerService(ENV_OK);
      fetchMock.mockResolvedValueOnce(reponse(erreurPapi('CORE_404', 'Aucun lien de paiement'), 404));
      expect((await erreurDe(s.lireStatut({ reference: 'r' }))).nature).toBe('introuvable');
      fetchMock.mockResolvedValueOnce(reponse(erreurPapi('CORE_PERM_0001', 'API key invalide'), 401));
      expect((await erreurDe(s.lireStatut({ reference: 'r' }))).nature).toBe('authentification');
    });

    it('propage une erreur HTTP, un JSON invalide et une erreur reseau', async () => {
      const s = creerService(ENV_OK);
      fetchMock.mockResolvedValueOnce(reponse('x', 500));
      expect((await erreurDe(s.lireStatut({ reference: 'r' }))).nature).toBe('http');
      fetchMock.mockResolvedValueOnce(reponse('pas json'));
      expect((await erreurDe(s.lireStatut({ reference: 'r' }))).nature).toBe('reponse_invalide');
      fetchMock.mockRejectedValueOnce(new Error('down'));
      expect((await erreurDe(s.lireStatut({ reference: 'r' }))).nature).toBe('reseau');
    });
  });

  describe('sonde d\'authentification (aucune ecriture chez Papi)', () => {
    it('404 sur une reference aleatoire : joignable et cle acceptee, uniquement un GET', async () => {
      fetchMock.mockResolvedValue(reponse(erreurPapi('CORE_404', 'Aucun lien'), 404));
      const r = await creerService(ENV_OK).sonderAuthentification();
      expect(r).toMatchObject({ joignable: true, authentifie: true, statutHttp: 404 });
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe('GET');
      expect(url).toMatch(/\/payment-links\/KIANJA-SONDE-[0-9A-F]{12}$/);
    });

    it('401 : cle refusee', async () => {
      fetchMock.mockResolvedValue(reponse(erreurPapi('CORE_PERM_0001', 'API key invalide'), 401));
      await expect(creerService(ENV_OK).sonderAuthentification()).resolves.toMatchObject({
        joignable: true,
        authentifie: false,
      });
    });

    it('DNS en echec : injoignable, cause dans le detail', async () => {
      fetchMock.mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }));
      const r = await creerService(ENV_OK).sonderAuthentification();
      expect(r).toMatchObject({ joignable: false, authentifie: null });
      expect(r.detail).toContain('DNS ENOTFOUND');
    });
  });
});

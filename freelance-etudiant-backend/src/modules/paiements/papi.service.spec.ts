import { ConfigService } from '@nestjs/config';
import { PapiService } from './papi.service';

function creerService(env: Record<string, string | undefined> = {}) {
  const config = {
    get: (cle: string) => env[cle],
  } as unknown as ConfigService;
  return new PapiService(config);
}

const ENV_OK = {
  PAPI_BASE_URL: 'https://api.papi.test/',
  PAPI_API_KEY: 'cle_secrete',
};

function reponse(corps: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: () => Promise.resolve(typeof corps === 'string' ? corps : JSON.stringify(corps)),
  } as Response;
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

  const params = {
    montantAr: 75000,
    reference: 'KIANJA-ABC123',
    description: 'Paiement mission "Site"',
    urlRetour: 'https://kianja.test/retour',
  };

  it('est inactif sans URL de base ou sans cle, et refuse tout appel', async () => {
    expect(creerService({}).estConfigure).toBe(false);
    expect(creerService({ PAPI_API_KEY: 'x' }).estConfigure).toBe(false);
    expect(creerService({ PAPI_BASE_URL: 'https://a.test' }).estConfigure).toBe(false);

    await expect(creerService({}).creerPaiement(params)).rejects.toThrow(/non configure/);
    await expect(creerService({}).verifierStatut('p1')).rejects.toThrow(/non configure/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cree un paiement : cle API, cle d\'idempotence, montant serveur', async () => {
    fetchMock.mockResolvedValue(
      reponse({ id: 'pay_1', paymentUrl: 'https://pay.papi.test/x', status: 'pending' }),
    );

    const res = await creerService(ENV_OK).creerPaiement(params);

    expect(res).toEqual({
      idFournisseur: 'pay_1',
      lienPaiement: 'https://pay.papi.test/x',
      statut: 'pending',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.papi.test/payments');
    expect(init.method).toBe('POST');
    const entetes = init.headers as Record<string, string>;
    expect(entetes.Authorization).toBe('Bearer cle_secrete');
    expect(entetes['Idempotency-Key']).toBe('KIANJA-ABC123');
    const corps = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(corps.amount).toBe(75000);
    expect(corps.reference).toBe('KIANJA-ABC123');
  });

  it('accepte une reponse enveloppee dans { data }', async () => {
    fetchMock.mockResolvedValue(
      reponse({ data: { id: 'pay_2', url: 'https://pay.papi.test/y' } }),
    );
    const res = await creerService(ENV_OK).creerPaiement(params);
    expect(res.idFournisseur).toBe('pay_2');
    expect(res.statut).toBe('pending');
  });

  it("permet de regler l'en-tete et le schema d'authentification", async () => {
    fetchMock.mockResolvedValue(
      reponse({ id: 'p', paymentUrl: 'https://pay.papi.test/z' }),
    );
    await creerService({
      ...ENV_OK,
      PAPI_AUTH_HEADER: 'X-Api-Key',
      PAPI_AUTH_SCHEME: '',
    }).creerPaiement(params);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const entetes = init.headers as Record<string, string>;
    expect(entetes['X-Api-Key']).toBe('cle_secrete');
    expect(entetes.Authorization).toBeUndefined();
  });

  it('refuse un lien de paiement non https (hors localhost) ou invalide', async () => {
    fetchMock.mockResolvedValueOnce(
      reponse({ id: 'p', paymentUrl: 'http://evil.test/x' }),
    );
    await expect(creerService(ENV_OK).creerPaiement(params)).rejects.toThrow(/https/);

    fetchMock.mockResolvedValueOnce(reponse({ id: 'p', paymentUrl: 'pas un url' }));
    await expect(creerService(ENV_OK).creerPaiement(params)).rejects.toThrow(/invalide/);

    fetchMock.mockResolvedValueOnce(
      reponse({ id: 'p', paymentUrl: 'http://localhost:9000/x' }),
    );
    await expect(creerService(ENV_OK).creerPaiement(params)).resolves.toBeDefined();
  });

  it('refuse une reponse sans identifiant ou sans lien', async () => {
    fetchMock.mockResolvedValueOnce(reponse({ paymentUrl: 'https://pay.papi.test/x' }));
    await expect(creerService(ENV_OK).creerPaiement(params)).rejects.toThrow(/sans identifiant/);
    fetchMock.mockResolvedValueOnce(reponse({ id: 'p' }));
    await expect(creerService(ENV_OK).creerPaiement(params)).rejects.toThrow(/sans identifiant/);
  });

  it("n'expose pas le corps d'erreur du fournisseur", async () => {
    fetchMock.mockResolvedValue(reponse('detail interne secret', false, 401));
    await expect(creerService(ENV_OK).creerPaiement(params)).rejects.toThrow(
      /refusee \(401\)$/,
    );
  });

  describe('statut', () => {
    it.each([
      ['paid', 'completed'],
      ['COMPLETED', 'completed'],
      ['failed', 'failed'],
      ['expired', 'failed'],
      ['pending', 'pending'],
      ['quelque_chose_d_inconnu', 'pending'],
      [undefined, 'pending'],
    ])('%s -> %s', async (brut, attendu) => {
      fetchMock.mockResolvedValue(reponse({ status: brut }));
      await expect(creerService(ENV_OK).verifierStatut('pay_1')).resolves.toBe(attendu);
    });

    it("encode l'identifiant dans le chemin", async () => {
      fetchMock.mockResolvedValue(reponse({ status: 'paid' }));
      await creerService(ENV_OK).verifierStatut('../admin?x=1');
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe('https://api.papi.test/payments/..%2Fadmin%3Fx%3D1');
    });

    it('propage une erreur HTTP (jamais de confirmation par defaut)', async () => {
      fetchMock.mockResolvedValue(reponse('boom', false, 500));
      await expect(creerService(ENV_OK).verifierStatut('p')).rejects.toThrow(/impossible/);
    });
  });
});

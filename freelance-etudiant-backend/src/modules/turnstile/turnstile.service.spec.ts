import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TurnstileService } from './turnstile.service';

const URL_OFFICIELLE =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SECRET = 'secret-de-test-ne-pas-logger';
const JETON = 'jeton-turnstile-de-test';

function creerService(surcharges: Record<string, unknown> = {}) {
  const valeurs: Record<string, unknown> = {
    'turnstile.secretKey': SECRET,
    'turnstile.verifyUrl': URL_OFFICIELLE,
    'turnstile.timeoutMs': 5000,
    'turnstile.enforceContext': false,
    'turnstile.hostnames': [],
    ...surcharges,
  };
  const config = {
    get: (cle: string) => valeurs[cle],
    getOrThrow: (cle: string) => {
      if (valeurs[cle] === undefined) throw new Error(`Manquant : ${cle}`);
      return valeurs[cle];
    },
  } as unknown as ConfigService;
  return new TurnstileService(config);
}

function reponse(corps: unknown, statut = 200) {
  return Promise.resolve(
    new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), {
      status: statut,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('TurnstileService', () => {
  let fetchMock: jest.SpyInstance;
  let journaux: jest.SpyInstance[];

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    journaux = [
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(),
      jest.spyOn(Logger.prototype, 'error').mockImplementation(),
      jest.spyOn(Logger.prototype, 'log').mockImplementation(),
    ];
  });
  afterEach(() => jest.restoreAllMocks());

  it('refuse un jeton absent ou vide sans appeler Cloudflare', async () => {
    const service = creerService();
    for (const jeton of [undefined, null, '', '   ']) {
      await expect(service.verifier(jeton)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuse un jeton demesurement long sans appeler Cloudflare', async () => {
    await expect(
      creerService().verifier('x'.repeat(2049)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepte un jeton valide et appelle Siteverify cote serveur', async () => {
    fetchMock.mockImplementation(() => reponse({ success: true }));
    await expect(
      creerService().verifier(JETON, { ip: '203.0.113.7' }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL_OFFICIELLE);
    const corps = JSON.parse(init.body);
    expect(corps.secret).toBe(SECRET);
    expect(corps.response).toBe(JETON);
    expect(corps.remoteip).toBe('203.0.113.7');
    expect(corps.idempotency_key).toEqual(expect.any(String));
    expect(init.signal).toBeDefined();
  });

  it('refuse un jeton invalide (success=false)', async () => {
    fetchMock.mockImplementation(() =>
      reponse({ success: false, 'error-codes': ['invalid-input-response'] }),
    );
    await expect(creerService().verifier(JETON)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuse un jeton expire ou deja utilise (timeout-or-duplicate)', async () => {
    fetchMock.mockImplementation(() =>
      reponse({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    );
    await expect(creerService().verifier(JETON)).rejects.toThrow(
      /expire ou a deja ete utilisee/,
    );
  });

  it('un meme jeton ne passe pas deux fois (Cloudflare le refuse la 2e fois)', async () => {
    fetchMock
      .mockImplementationOnce(() => reponse({ success: true }))
      .mockImplementationOnce(() =>
        reponse({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      );
    const service = creerService();
    await expect(service.verifier(JETON)).resolves.toBeUndefined();
    await expect(service.verifier(JETON)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  describe('fail-closed', () => {
    it('erreur reseau -> 503, operation refusee', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      await expect(creerService().verifier(JETON)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('delai depasse -> 503, operation refusee', async () => {
      fetchMock.mockRejectedValue(
        Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
      );
      await expect(creerService().verifier(JETON)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('HTTP 500 de Cloudflare -> 503', async () => {
      fetchMock.mockImplementation(() => reponse({}, 500));
      await expect(creerService().verifier(JETON)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('corps non JSON -> 503', async () => {
      fetchMock.mockImplementation(() => reponse('<html>oops</html>'));
      await expect(creerService().verifier(JETON)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('reponse sans champ success -> 503 (jamais accepte par defaut)', async () => {
      fetchMock.mockImplementation(() => reponse({ hostname: 'x' }));
      await expect(creerService().verifier(JETON)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('secret refuse par Cloudflare -> 503 (erreur de configuration, pas utilisateur)', async () => {
      fetchMock.mockImplementation(() =>
        reponse({ success: false, 'error-codes': ['invalid-input-secret'] }),
      );
      await expect(creerService().verifier(JETON)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('cle secrete absente de la configuration -> erreur explicite', async () => {
      const service = creerService({ 'turnstile.secretKey': undefined });
      await expect(service.verifier(JETON)).rejects.toThrow(
        /turnstile\.secretKey/,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('controle de contexte (hostname + action)', () => {
    const contexte = {
      'turnstile.enforceContext': true,
      'turnstile.hostnames': ['kianja.example'],
    };

    it('accepte le bon hostname et la bonne action', async () => {
      fetchMock.mockImplementation(() =>
        reponse({ success: true, hostname: 'kianja.example', action: 'connexion' }),
      );
      await expect(
        creerService(contexte).verifier(JETON, { actionsAttendues: ['connexion'] }),
      ).resolves.toBeUndefined();
    });

    it('refuse un hostname non autorise', async () => {
      fetchMock.mockImplementation(() =>
        reponse({ success: true, hostname: 'evil.example', action: 'connexion' }),
      );
      await expect(
        creerService(contexte).verifier(JETON, { actionsAttendues: ['connexion'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse une action differente (jeton rejoue sur une autre route)', async () => {
      fetchMock.mockImplementation(() =>
        reponse({ success: true, hostname: 'kianja.example', action: 'contact' }),
      );
      await expect(
        creerService(contexte).verifier(JETON, { actionsAttendues: ['connexion'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse une reponse sans action quand une action est attendue', async () => {
      fetchMock.mockImplementation(() =>
        reponse({ success: true, hostname: 'kianja.example' }),
      );
      await expect(
        creerService(contexte).verifier(JETON, { actionsAttendues: ['connexion'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ignore hostname/action quand le controle est inactif (cles de test)', async () => {
      fetchMock.mockImplementation(() =>
        reponse({ success: true, hostname: 'example.com', action: 'test' }),
      );
      await expect(
        creerService().verifier(JETON, { actionsAttendues: ['connexion'] }),
      ).resolves.toBeUndefined();
    });
  });

  it('ne journalise jamais le jeton ni la cle secrete', async () => {
    const scenarios: Array<() => void> = [
      () => fetchMock.mockImplementation(() => reponse({ success: false, 'error-codes': ['invalid-input-response'] })),
      () => fetchMock.mockRejectedValue(new TypeError('fetch failed')),
      () => fetchMock.mockImplementation(() => reponse({}, 500)),
      () => fetchMock.mockImplementation(() => reponse({ success: false, 'error-codes': ['invalid-input-secret'] })),
    ];
    for (const preparer of scenarios) {
      preparer();
      await creerService().verifier(JETON).catch(() => undefined);
    }
    const sortie = JSON.stringify(journaux.flatMap((j) => j.mock.calls));
    expect(sortie).not.toContain(JETON);
    expect(sortie).not.toContain(SECRET);
  });
});

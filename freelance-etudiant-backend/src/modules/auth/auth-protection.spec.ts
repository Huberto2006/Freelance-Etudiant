import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ContactController } from '../contact/contact.controller';
import { ContactService } from '../contact/contact.service';
import { TurnstileService } from '../turnstile/turnstile.service';
import { TurnstileGuard } from '../turnstile/turnstile.guard';
import { Role } from '../../common/enums/role.enum';

/*
 * Test d'integration HTTP : verifie que le garde Turnstile est reellement
 * branche sur chaque route sensible et que Cloudflare (fetch) est appele
 * cote serveur. Cloudflare est simule ; aucun appel reseau reel.
 */
const ENTETE = 'X-Turnstile-Token';
const SESSION = {
  accessToken: 'acces',
  refreshToken: 'refresh',
  refreshExp: 2_000_000_000,
  premiereConnexion: false,
  utilisateur: { id: 'u1', email: 'a@b.mg', role: Role.ETUDIANT },
};

const ROUTES_PROTEGEES: Array<{
  nom: string;
  chemin: string;
  corps: Record<string, unknown>;
  action: string;
  service: 'auth' | 'contact';
  methode: string;
}> = [
  { nom: 'connexion', chemin: '/api/v1/auth/login', corps: { email: 'a@b.mg', motDePasse: 'MotDePasse123!' }, action: 'connexion', service: 'auth', methode: 'login' },
  { nom: 'inscription', chemin: '/api/v1/auth/register', corps: { nom: 'Lanja', email: 'a@b.mg', motDePasse: 'MotDePasse123!', role: 'etudiant' }, action: 'inscription', service: 'auth', methode: 'register' },
  { nom: 'mot de passe oublie', chemin: '/api/v1/auth/forgot-password', corps: { email: 'a@b.mg' }, action: 'mot-de-passe-oublie', service: 'auth', methode: 'forgotPassword' },
  { nom: 'connexion Google', chemin: '/api/v1/auth/google', corps: { idToken: 'aaa.bbb.ccc' }, action: 'connexion', service: 'auth', methode: 'loginAvecGoogle' },
  { nom: 'contact', chemin: '/api/v1/contact', corps: { nom: 'Lanja', email: 'a@b.mg', sujet: 'Bonjour', message: 'Un message assez long.' }, action: 'contact', service: 'contact', methode: 'envoyer' },
];

async function creerApp(valeurs: Record<string, unknown> = {}) {
  const config: Record<string, unknown> = {
    'turnstile.secretKey': 'secret',
    'turnstile.verifyUrl': 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    'turnstile.timeoutMs': 5000,
    'turnstile.enforceContext': false,
    'turnstile.hostnames': [],
    ...valeurs,
  };
  const authService = {
    login: jest.fn().mockResolvedValue(SESSION),
    register: jest.fn().mockResolvedValue({ message: 'ok', email: 'a@b.mg' }),
    forgotPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
    loginAvecGoogle: jest.fn().mockResolvedValue(SESSION),
    verifierEmail: jest.fn().mockResolvedValue({ message: 'ok' }),
    renvoyerVerificationEmail: jest.fn().mockResolvedValue({ message: 'ok' }),
    resetPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
  };
  const contactService = { envoyer: jest.fn().mockResolvedValue({ message: 'ok' }) };

  const module = await Test.createTestingModule({
    controllers: [AuthController, ContactController],
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: ContactService, useValue: contactService },
      {
        provide: ConfigService,
        useValue: {
          get: (cle: string) => config[cle],
          getOrThrow: (cle: string) => config[cle],
        },
      },
      TurnstileService,
      TurnstileGuard,
    ],
  }).compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  // Meme configuration que main.ts.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return { app, authService, contactService };
}

function reponseCloudflare(corps: unknown, statut = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(corps), { status: statut }),
  );
}

describe('Turnstile branche sur les routes sensibles (HTTP)', () => {
  let app: INestApplication;
  let authService: Record<string, jest.Mock>;
  let contactService: Record<string, jest.Mock>;
  let fetchMock: jest.SpyInstance;

  const service = (r: (typeof ROUTES_PROTEGEES)[number]) =>
    r.service === 'auth' ? authService : contactService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    fetchMock = jest.spyOn(global, 'fetch');
    ({ app, authService, contactService } = await creerApp());
  });
  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  describe.each(ROUTES_PROTEGEES)('$nom', (route) => {
    it('sans jeton Turnstile : 400, operation non executee, Cloudflare non appele', async () => {
      const res = await request(app.getHttpServer()).post(route.chemin).send(route.corps);
      expect(res.status).toBe(400);
      expect(service(route)[route.methode]).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('jeton refuse par Cloudflare : 400, operation non executee', async () => {
      fetchMock.mockImplementation(() =>
        reponseCloudflare({ success: false, 'error-codes': ['invalid-input-response'] }),
      );
      const res = await request(app.getHttpServer())
        .post(route.chemin).set(ENTETE, 'faux').send(route.corps);
      expect(res.status).toBe(400);
      expect(service(route)[route.methode]).not.toHaveBeenCalled();
    });

    it('Cloudflare injoignable : 503 (fail-closed), operation non executee', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const res = await request(app.getHttpServer())
        .post(route.chemin).set(ENTETE, 'jeton').send(route.corps);
      expect(res.status).toBe(503);
      expect(service(route)[route.methode]).not.toHaveBeenCalled();
    });

    it('jeton valide verifie cote serveur : operation executee', async () => {
      fetchMock.mockImplementation(() => reponseCloudflare({ success: true }));
      const res = await request(app.getHttpServer())
        .post(route.chemin).set(ENTETE, 'jeton-valide').send(route.corps);
      // 201 pour /auth/register (comportement existant), 200 pour les autres.
      expect([200, 201]).toContain(res.status);
      expect(service(route)[route.methode]).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).response).toBe('jeton-valide');
    });
  });

  it('login : le cookie de session est pose apres une verification reussie', async () => {
    fetchMock.mockImplementation(() => reponseCloudflare({ success: true }));
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login').set(ENTETE, 'ok')
      .send({ email: 'a@b.mg', motDePasse: 'MotDePasse123!' });
    expect(res.body).toEqual({
      accessToken: 'acces',
      premiereConnexion: false,
      utilisateur: SESSION.utilisateur,
    });
    expect(JSON.stringify(res.body)).not.toContain('refresh');
    expect(String(res.headers['set-cookie'])).toMatch(/kianja_refresh=refresh.*HttpOnly/i);
  });

  it('/auth/google : un role ou un champ superflu envoye par le navigateur est refuse', async () => {
    fetchMock.mockImplementation(() => reponseCloudflare({ success: true }));
    for (const extra of [{ role: 'admin' }, { email: 'admin@kianja.mg' }, { googleId: 'x' }]) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/google').set(ENTETE, 'ok')
        .send({ idToken: 'aaa.bbb.ccc', ...extra });
      expect(res.status).toBe(400);
    }
    expect(authService.loginAvecGoogle).not.toHaveBeenCalled();
  });

  it('/auth/google : jeton Google absent ou mal forme -> 400', async () => {
    fetchMock.mockImplementation(() => reponseCloudflare({ success: true }));
    for (const corps of [{}, { idToken: '' }, { idToken: 'pas-un-jwt' }]) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/google').set(ENTETE, 'ok').send(corps);
      expect(res.status).toBe(400);
    }
    expect(authService.loginAvecGoogle).not.toHaveBeenCalled();
  });

  describe('non-regression : routes volontairement hors Turnstile', () => {
    it('verify-email, resend-verification et reset-password restent accessibles sans jeton', async () => {
      for (const [chemin, corps] of [
        ['/api/v1/auth/verify-email', { token: 'abc' }],
        ['/api/v1/auth/resend-verification', { email: 'a@b.mg' }],
        ['/api/v1/auth/reset-password', { token: 'abc', nouveauMotDePasse: 'MotDePasse123!' }],
      ] as const) {
        const res = await request(app.getHttpServer()).post(chemin).send(corps);
        expect(res.status).toBe(200);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refresh / logout gardent leur protection CSRF et ne dependent pas de Turnstile', async () => {
      for (const chemin of ['/api/v1/auth/refresh', '/api/v1/auth/logout']) {
        const res = await request(app.getHttpServer()).post(chemin).send({});
        expect(res.status).toBe(403);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

describe('Turnstile : controle du contexte (action) sur les routes', () => {
  it('un jeton obtenu pour "contact" est refuse sur la connexion', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const fetchMock = jest.spyOn(global, 'fetch');
    const { app, authService } = await creerApp({
      'turnstile.enforceContext': true,
      'turnstile.hostnames': ['kianja.example'],
    });
    try {
      fetchMock.mockImplementation(() =>
        reponseCloudflare({ success: true, hostname: 'kianja.example', action: 'contact' }),
      );
      const refuse = await request(app.getHttpServer())
        .post('/api/v1/auth/login').set(ENTETE, 'jeton')
        .send({ email: 'a@b.mg', motDePasse: 'MotDePasse123!' });
      expect(refuse.status).toBe(400);
      expect(authService.login).not.toHaveBeenCalled();

      fetchMock.mockImplementation(() =>
        reponseCloudflare({ success: true, hostname: 'kianja.example', action: 'connexion' }),
      );
      const accepte = await request(app.getHttpServer())
        .post('/api/v1/auth/login').set(ENTETE, 'jeton')
        .send({ email: 'a@b.mg', motDePasse: 'MotDePasse123!' });
      expect(accepte.status).toBe(200);
    } finally {
      await app.close();
      jest.restoreAllMocks();
    }
  });
});

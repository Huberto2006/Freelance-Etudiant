import turnstileConfig from './turnstile.config';
import googleConfig from './google.config';

describe('configuration Turnstile / Google (validation au demarrage)', () => {
  const envInitial = { ...process.env };
  afterEach(() => {
    process.env = { ...envInitial };
  });

  describe('Turnstile', () => {
    it('refuse le demarrage sans TURNSTILE_SECRET_KEY', () => {
      delete process.env.TURNSTILE_SECRET_KEY;
      expect(() => turnstileConfig()).toThrow(/TURNSTILE_SECRET_KEY/);
    });

    it('refuse une cle secrete vide', () => {
      process.env.TURNSTILE_SECRET_KEY = '   ';
      expect(() => turnstileConfig()).toThrow(/TURNSTILE_SECRET_KEY/);
    });

    it('en developpement : controle de contexte inactif par defaut', () => {
      process.env.NODE_ENV = 'development';
      process.env.TURNSTILE_SECRET_KEY = 's';
      expect(turnstileConfig().enforceContext).toBe(false);
    });

    it('en production : contexte actif, hostnames derives des origines CORS', () => {
      process.env.NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 's';
      process.env.FRONTEND_URL = 'https://kianja.example';
      delete process.env.CORS_ORIGIN;
      delete process.env.TURNSTILE_ALLOWED_HOSTNAMES;
      const cfg = turnstileConfig();
      expect(cfg.enforceContext).toBe(true);
      expect(cfg.hostnames).toEqual(['kianja.example']);
    });

    it("en production : l'URL Siteverify ne peut pas etre modifiee", () => {
      process.env.NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 's';
      process.env.FRONTEND_URL = 'https://kianja.example';
      process.env.TURNSTILE_VERIFY_URL = 'http://localhost:9999/fake';
      expect(() => turnstileConfig()).toThrow(/TURNSTILE_VERIFY_URL/);
    });

    it('refuse un delai hors bornes', () => {
      process.env.TURNSTILE_SECRET_KEY = 's';
      process.env.TURNSTILE_TIMEOUT_MS = '10';
      expect(() => turnstileConfig()).toThrow(/TURNSTILE_TIMEOUT_MS/);
    });
  });

  describe('Google', () => {
    it('refuse le demarrage en production sans GOOGLE_CLIENT_ID', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.GOOGLE_CLIENT_ID;
      expect(() => googleConfig()).toThrow(/GOOGLE_CLIENT_ID/);
    });

    it('hors production : absent toléré (clientId null, endpoint en 503)', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.GOOGLE_CLIENT_ID;
      expect(googleConfig().clientId).toBeNull();
    });

    it('refuse un Client ID mal forme', () => {
      process.env.GOOGLE_CLIENT_ID = 'pas-un-client-id';
      expect(() => googleConfig()).toThrow(/GOOGLE_CLIENT_ID/);
    });

    it('accepte un Client ID valide', () => {
      process.env.GOOGLE_CLIENT_ID = 'abc-123.apps.googleusercontent.com';
      expect(googleConfig().clientId).toBe('abc-123.apps.googleusercontent.com');
    });
  });
});

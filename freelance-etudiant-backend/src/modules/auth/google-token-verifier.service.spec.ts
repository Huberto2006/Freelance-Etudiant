import * as crypto from 'crypto';
import {
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

/*
 * Verification REELLE de signatures : on genere une paire RSA, on signe de
 * vrais JWT et on remplace uniquement la recuperation des cles publiques de
 * Google (reseau) par notre cle de test. Signature, expiration, emetteur et
 * audience sont donc controles par google-auth-library, pas par un mock.
 */
const CLIENT_ID = 'kianja-test.apps.googleusercontent.com';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const { privateKey: autreCle } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

const b64 = (donnees: string | Buffer) =>
  Buffer.from(donnees).toString('base64url');

function signer(
  payload: Record<string, unknown>,
  options: { cle?: crypto.KeyObject; alg?: string } = {},
): string {
  const header = { alg: options.alg ?? 'RS256', typ: 'JWT', kid: 'k1' };
  const donnees = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(payload))}`;
  if (options.alg === 'none') return `${donnees}.`;
  const signature = crypto.sign(
    'RSA-SHA256',
    Buffer.from(donnees),
    options.cle ?? privateKey,
  );
  return `${donnees}.${b64(signature)}`;
}

function payload(surcharges: Record<string, unknown> = {}) {
  const maintenant = Math.floor(Date.now() / 1000);
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '1234567890',
    email: 'Lanja@Exemple.MG',
    email_verified: true,
    name: 'Lanja Rakoto',
    iat: maintenant,
    exp: maintenant + 3600,
    ...surcharges,
  };
}

function creerService(clientId: string | null = CLIENT_ID) {
  const config = {
    get: (cle: string) => (cle === 'google.clientId' ? clientId : undefined),
  } as unknown as ConfigService;
  return new GoogleTokenVerifierService(config);
}

describe('GoogleTokenVerifierService (signatures reelles)', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest
      .spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync')
      .mockResolvedValue({
        certs: { k1: publicPem },
        format: 'PEM',
      } as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('accepte un jeton valide et normalise email / nom', async () => {
    await expect(creerService().verifier(signer(payload()))).resolves.toEqual({
      sub: '1234567890',
      email: 'lanja@exemple.mg',
      nom: 'Lanja Rakoto',
    });
  });

  it("utilise la partie locale de l'email normalise si le nom est absent", async () => {
    const identite = await creerService().verifier(
      signer(payload({ name: undefined })),
    );
    expect(identite.nom).toBe('lanja');
  });

  it('accepte aussi la forme sans schema de l\'emetteur', async () => {
    await expect(
      creerService().verifier(signer(payload({ iss: 'accounts.google.com' }))),
    ).resolves.toMatchObject({ sub: '1234567890' });
  });

  it('refuse un jeton altere (payload modifie, signature d\'origine)', async () => {
    const [h, , s] = signer(payload()).split('.');
    const falsifie = `${h}.${b64(JSON.stringify(payload({ sub: 'victime', email: 'admin@kianja.mg' })))}.${s}`;
    await expect(creerService().verifier(falsifie)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuse un jeton signe par une autre cle', async () => {
    await expect(
      creerService().verifier(signer(payload(), { cle: autreCle })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un jeton expire', async () => {
    const maintenant = Math.floor(Date.now() / 1000);
    await expect(
      creerService().verifier(
        signer(payload({ iat: maintenant - 7200, exp: maintenant - 3600 })),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse une audience incorrecte (jeton emis pour une autre application)', async () => {
    await expect(
      creerService().verifier(
        signer(payload({ aud: 'autre-app.apps.googleusercontent.com' })),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un emetteur incorrect', async () => {
    await expect(
      creerService().verifier(signer(payload({ iss: 'https://evil.example' }))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un jeton alg=none (non signe)', async () => {
    await expect(
      creerService().verifier(signer(payload(), { alg: 'none' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un jeton sans sub', async () => {
    await expect(
      creerService().verifier(signer(payload({ sub: undefined }))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuse un email non verifie par Google', async () => {
    await expect(
      creerService().verifier(signer(payload({ email_verified: false }))),
    ).rejects.toThrow(/pas verifiee par Google/);
  });

  it('refuse email_verified absent ou non booleen', async () => {
    for (const valeur of [undefined, 'true', 1]) {
      await expect(
        creerService().verifier(signer(payload({ email_verified: valeur }))),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('refuse un jeton qui n\'est pas un JWT', async () => {
    await expect(
      creerService().verifier('pas.un.jwt'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('Google injoignable -> 503 controle, sans details', async () => {
    jest
      .spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync')
      .mockRejectedValue(Object.assign(new Error('getaddrinfo'), { code: 'ENOTFOUND' }));
    const erreur = await creerService()
      .verifier(signer(payload()))
      .catch((e) => e);
    expect(erreur).toBeInstanceOf(ServiceUnavailableException);
    expect(String(erreur.message)).not.toMatch(/getaddrinfo|ENOTFOUND/);
  });

  it('GOOGLE_CLIENT_ID non configure -> 503', async () => {
    await expect(
      creerService(null).verifier(signer(payload())),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('les messages d\'erreur ne divulguent pas le jeton', async () => {
    const jeton = signer(payload({ aud: 'autre' }));
    const erreur = await creerService().verifier(jeton).catch((e) => e);
    expect(String(erreur.message)).not.toContain(jeton);
  });
});

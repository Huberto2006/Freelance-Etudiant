import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../common/enums/role.enum';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { templateVerificationEmail } from '../email/templates/verification-email.template';

describe('AuthService - verification email', () => {
  afterEach(() => jest.restoreAllMocks());

  function creer(emailAccepteParSmtp: boolean) {
    const users = {
      assertEmailDisponible: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(async (donnees: Partial<Utilisateur>) => ({
        ...donnees,
        id: 'utilisateur-1',
      })),
      save: jest.fn(async (utilisateur: Utilisateur) => ({
        ...utilisateur,
        id: 'utilisateur-1',
      })),
      findByEmailVerificationToken: jest.fn(),
    };
    const config = {
      get: jest.fn((cle: string) =>
        cle === 'app.frontendUrl' ? 'https://kianja.arato.mg/' : undefined,
      ),
    };
    const email = {
      envoyerVerificationEmail: jest.fn().mockResolvedValue(emailAccepteParSmtp),
    };
    const service = new AuthService(
      users as unknown as UsersService,
      {} as JwtService,
      config as unknown as ConfigService,
      email as unknown as EmailService,
      {} as GoogleTokenVerifierService,
      {} as never,
    );
    return { service, users, email };
  }

  const inscription: RegisterDto = {
    nom: 'Test',
    email: 'test@example.mg',
    motDePasse: 'mot-de-passe-de-test',
    role: Role.ETUDIANT,
    langue: 'mg',
  };

  it("enregistre une empreinte, construit le lien de production et indique l'acceptation SMTP", async () => {
    const { service, users, email } = creer(true);

    const reponse = await service.register(inscription);

    expect(reponse.emailAccepteParSmtp).toBe(true);
    expect(reponse.message).toContain("accepte l'email");
    const [destinataire, contenu] =
      email.envoyerVerificationEmail.mock.calls[0];
    expect(destinataire).toBe(inscription.email);
    expect(contenu.langue).toBe('mg');

    const lien = new URL(contenu.lien);
    expect(lien.origin).toBe('https://kianja.arato.mg');
    expect(lien.pathname).toBe('/verification-email');
    const jeton = lien.searchParams.get('token');
    expect(jeton).toMatch(/^[a-f0-9]{64}$/);
    if (!jeton) throw new Error('Le lien doit contenir un jeton');

    const modele = templateVerificationEmail(contenu);
    expect(modele.html).toContain(lien.toString());
    expect(modele.text).toContain(lien.toString());

    const utilisateurSauve = users.save.mock.calls[1][0];
    const empreinte = crypto.createHash('sha256').update(jeton).digest('hex');
    expect(utilisateurSauve.emailVerificationTokenHash).toBe(empreinte);
    expect(utilisateurSauve.emailVerificationExpire?.getTime()).toBeGreaterThan(
      Date.now(),
    );

    users.findByEmailVerificationToken.mockResolvedValue(utilisateurSauve);
    await expect(service.verifierEmail({ token: jeton })).resolves.toMatchObject({
      message: expect.stringContaining('verifiee avec succes'),
    });
    expect(utilisateurSauve.emailVerifie).toBe(true);
    expect(utilisateurSauve.emailVerificationTokenHash).toBeNull();
    expect(utilisateurSauve.emailVerificationExpire).toBeNull();

    users.findByEmailVerificationToken.mockResolvedValue(null);
    await expect(service.verifierEmail({ token: jeton })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("ne presente pas le message comme envoye si SMTP ne l'accepte pas", async () => {
    const { service, email } = creer(false);

    const reponse = await service.register(inscription);

    expect(email.envoyerVerificationEmail).toHaveBeenCalledTimes(1);
    expect(reponse.emailAccepteParSmtp).toBe(false);
    expect(reponse.message).toContain("n'a pas accepte");
  });
});

import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { ContactService } from './contact.service';
import { EnvoyerMessageContactDto } from './dto/envoyer-message-contact.dto';

function creerConfig(valeurs: Record<string, string | undefined>): ConfigService {
  return {
    get: (cle: string) => valeurs[cle],
  } as unknown as ConfigService;
}

function dto(): EnvoyerMessageContactDto {
  return {
    nom: 'Lanja',
    email: 'lanja@example.com',
    sujet: 'Question',
    message: 'Bonjour, ceci est un message de test.',
  };
}

describe('ContactService', () => {
  it('accepte une configuration valide avec CONTACT_MAIL_TO', async () => {
    const emailService = { envoyerMail: jest.fn().mockResolvedValue(true) };
    const service = new ContactService(
      creerConfig({
        CONTACT_MAIL_TO: 'support@kianja.mg',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'secret',
      }),
      emailService as unknown as EmailService,
    );

    await expect(service.envoyer(dto())).resolves.toEqual({
      message: 'Votre message a bien ete envoye.',
    });
    expect(emailService.envoyerMail).toHaveBeenCalledWith(
      'support@kianja.mg',
      '[Contact Kianja] Question',
      expect.stringContaining('Nouveau message depuis le formulaire de contact Kianja'),
      expect.stringContaining('Bonjour, ceci est un message de test.'),
      'lanja@example.com',
    );
  });

  it('accepte CONTACT_EMAIL en compatibilite avec les deployments historiques', async () => {
    const emailService = { envoyerMail: jest.fn().mockResolvedValue(true) };
    const service = new ContactService(
      creerConfig({
        CONTACT_EMAIL: 'legacy@kianja.mg',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'secret',
      }),
      emailService as unknown as EmailService,
    );

    await service.envoyer(dto());
    expect(emailService.envoyerMail).toHaveBeenCalledWith(
      'legacy@kianja.mg',
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'lanja@example.com',
    );
  });

  it('refuse quand aucun destinataire n’est configure', async () => {
    const emailService = { envoyerMail: jest.fn() };
    const service = new ContactService(
      creerConfig({
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'secret',
      }),
      emailService as unknown as EmailService,
    );

    await expect(service.envoyer(dto())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(emailService.envoyerMail).not.toHaveBeenCalled();
  });

  it('refuse quand la configuration SMTP est incomplète', async () => {
    const emailService = { envoyerMail: jest.fn() };
    const service = new ContactService(
      creerConfig({
        CONTACT_MAIL_TO: 'support@kianja.mg',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
      }),
      emailService as unknown as EmailService,
    );

    await expect(service.envoyer(dto())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(emailService.envoyerMail).not.toHaveBeenCalled();
  });

  it('refuse quand l’envoi SMTP echoue', async () => {
    const emailService = { envoyerMail: jest.fn().mockResolvedValue(false) };
    const service = new ContactService(
      creerConfig({
        CONTACT_MAIL_TO: 'support@kianja.mg',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'secret',
      }),
      emailService as unknown as EmailService,
    );

    await expect(service.envoyer(dto())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('renvoie un succès quand le message est bien envoye', async () => {
    const emailService = { envoyerMail: jest.fn().mockResolvedValue(true) };
    const service = new ContactService(
      creerConfig({
        CONTACT_MAIL_TO: 'support@kianja.mg',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'secret',
      }),
      emailService as unknown as EmailService,
    );

    await expect(service.envoyer(dto())).resolves.toEqual({
      message: 'Votre message a bien ete envoye.',
    });
  });

  it('ignore le honeypot et ne transmet pas d’email', async () => {
    const emailService = { envoyerMail: jest.fn() };
    const service = new ContactService(
      creerConfig({
        CONTACT_MAIL_TO: 'support@kianja.mg',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'user',
        SMTP_PASS: 'secret',
      }),
      emailService as unknown as EmailService,
    );

    await expect(
      service.envoyer({ ...dto(), siteWeb: 'https://evil.example' }),
    ).resolves.toEqual({ message: 'Votre message a bien ete envoye.' });
    expect(emailService.envoyerMail).not.toHaveBeenCalled();
  });
});

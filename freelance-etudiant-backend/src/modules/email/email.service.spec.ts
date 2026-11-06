import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

describe('EmailService', () => {
  afterEach(() => jest.restoreAllMocks());

  function creerService(config: Record<string, string | undefined>) {
    const configService = {
      get: jest.fn((key: string) => config[key]),
    };
    return new EmailService(configService as unknown as ConfigService);
  }

  it("n'annonce pas un envoi quand SMTP n'est pas configure et ne journalise pas le contenu", async () => {
    const avertissement = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation();
    const creerTransport = jest.spyOn(nodemailer, 'createTransport');
    const jeton = 'jeton-de-verification-a-ne-pas-journaliser';
    const service = creerService({});

    await expect(
      service.envoyerMail(
        'test@example.mg',
        'Verification',
        `<a href="${jeton}">Lien</a>`,
        jeton,
      ),
    ).resolves.toBe(false);

    expect(avertissement.mock.calls.flat().join(' ')).not.toContain(jeton);
    expect(creerTransport).not.toHaveBeenCalled();
  });

  it('retourne true uniquement si SMTP accepte le message', async () => {
    const sendMail = jest.fn().mockResolvedValue({
      accepted: ['test@example.mg'],
      rejected: [],
      response: '250 2.0.0 queued',
    });
    const journal = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation();
    jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail } as never);
    const service = creerService({
      SMTP_HOST: 'mail.example.mg',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'test-user',
      SMTP_PASS: 'test-password',
    });

    await expect(
      service.envoyerMail('test@example.mg', 'Verification', '<p>Bonjour</p>', 'Bonjour'),
    ).resolves.toBe(true);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mail.example.mg',
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      }),
    );
    expect(journal.mock.calls.flat().join(' ')).toContain('code=250');
  });

  it('retourne false si Nodemailer ne leve pas mais que le serveur refuse le destinataire', async () => {
    const sendMail = jest.fn().mockResolvedValue({
      accepted: [],
      rejected: ['test@example.mg'],
      response: '550 5.1.1 rejected',
    });
    jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail } as never);
    const service = creerService({
      SMTP_HOST: 'mail.example.mg',
      SMTP_USER: 'test-user',
      SMTP_PASS: 'test-password',
    });

    await expect(
      service.envoyerMail('test@example.mg', 'Verification', '<p>Bonjour</p>', 'Bonjour'),
    ).resolves.toBe(false);
  });

  it('capture une erreur de connexion sans journaliser son message potentiellement sensible', async () => {
    const erreur = '550 login refused test-password';
    const journal = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    const sendMail = jest.fn().mockRejectedValue(new Error(erreur));
    jest
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail } as never);
    const service = creerService({
      SMTP_HOST: 'mail.example.mg',
      SMTP_USER: 'test-user',
      SMTP_PASS: 'test-password',
    });

    await expect(
      service.envoyerMail('test@example.mg', 'Verification', '<p>Bonjour</p>', 'Bonjour'),
    ).resolves.toBe(false);

    expect(journal.mock.calls.flat().join(' ')).not.toContain(erreur);
  });
});

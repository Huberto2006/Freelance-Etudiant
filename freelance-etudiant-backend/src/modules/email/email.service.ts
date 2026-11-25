import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { nettoyerSujet } from '../../common/utils/html.util';
import type { Transporter } from 'nodemailer';

import {
  EmailResetPassword,
  templateResetPassword,
} from './templates/reset-password.template';
import {
  EmailVerification,
  templateVerificationEmail,
} from './templates/verification-email.template';
import {
  EmailPaiement,
  templatePaiementConfirme,
  templatePaiementInitie,
  templatePaiementLibere,
} from './templates/paiement.template';
import {
  EmailNouvelleConnexion,
  templateNouvelleConnexion,
} from './templates/nouvelle-connexion.template';

interface ErreurSmtp extends Error {
  code?: string;
  responseCode?: number;
  command?: string;
}

/**
 * Service d'envoi d'emails reels via SMTP (Nodemailer).
 *
 * Principes :
 * - Le retour true signifie que le serveur SMTP a accepte le message,
 *   pas qu'il a ete livre dans la boite du destinataire.
 * - Les erreurs et le mode sans SMTP sont journalises sans contenu,
 *   destinataire ni jeton.
 * - Aucun secret dans le code : tout vient des variables d'environment.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporteur: Transporter | null = null;
  private smtpConfigure: boolean | null = null;
  private readonly expediteur: string;

  constructor(private readonly configService: ConfigService) {
    this.expediteur =
      this.configService.get<string>('MAIL_FROM') || 'KIANJA <no-reply@kianja.mg>';
  }

  /** Construit le transporteur a la premiere utilisation. */
  private async obtenirTransporteur(): Promise<Transporter | null> {
    if (this.smtpConfigure === null) {
      const host = this.configService.get<string>('SMTP_HOST');
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');

      this.smtpConfigure = Boolean(host && user && pass);
      if (!this.smtpConfigure) {
        this.logger.warn(
          "SMTP non configure (SMTP_HOST/SMTP_USER/SMTP_PASS absents) : aucun email ne sera envoye.",
        );
      }
    }

    if (!this.smtpConfigure) {
      return null;
    }

    if (!this.transporteur) {
      const port = parseInt(
        this.configService.get<string>('SMTP_PORT') ?? '587',
        10,
      );
      const secure =
        this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;

      this.transporteur = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port,
        secure,
        requireTLS: port === 587 && !secure,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }

    return this.transporteur;
  }

  /**
   * Envoi bas niveau. Ne leve jamais d'exception : retourne true si
   * l'email est reellement parti (ou a ete journalise en mode console
   * sans SMTP), false en cas d'echec SMTP.
   */
  async envoyerMail(
    destinataire: string,
    subject: string,
    html: string,
    text: string,
    replyTo?: string,
  ): Promise<boolean> {
    try {
      const transporteur = await this.obtenirTransporteur();
      if (!transporteur) return false;

      const resultat = await transporteur.sendMail({
        from: this.expediteur,
        to: destinataire,
        subject: nettoyerSujet(subject),
        html,
        text,
        ...(replyTo ? { replyTo: nettoyerSujet(replyTo) } : {}),
      });
      const acceptes = resultat.accepted ?? [];
      const refuses = resultat.rejected ?? [];

      if (acceptes.length === 0 || refuses.length > 0) {
        this.logger.warn(
          `SMTP n'a accepte aucun destinataire pour ce message (acceptes=${acceptes.length}, refuses=${refuses.length}).`,
        );
        return false;
      }

      const codeReponse = resultat.response?.match(/^\s*(\d{3})/)?.[1];
      this.logger.log(
        `SMTP a accepte le message${codeReponse ? ` (code=${codeReponse})` : ''}.`,
      );
      return true;
    } catch (error) {
      const erreur = error instanceof Error ? (error as ErreurSmtp) : undefined;
      const details = [
        erreur?.code && `code=${erreur.code}`,
        erreur?.responseCode && `responseCode=${erreur.responseCode}`,
        erreur?.command && `command=${erreur.command}`,
      ]
        .filter(Boolean)
        .join(', ');
      this.logger.error(`Echec SMTP${details ? ` (${details})` : ''}.`);
      return false;
    }
  }

  // ============================================================
  // EMAILS METIER
  // ============================================================

  async envoyerResetPassword(destinataire: string, data: EmailResetPassword): Promise<boolean> {
    const { subject, html, text } = templateResetPassword(data);
    return this.envoyerMail(destinataire, subject, html, text);
  }

  async envoyerVerificationEmail(destinataire: string, data: EmailVerification): Promise<boolean> {
    const { subject, html, text } = templateVerificationEmail(data);
    return this.envoyerMail(destinataire, subject, html, text);
  }

  async envoyerPaiementInitie(destinataire: string, data: EmailPaiement): Promise<boolean> {
    const { subject, html, text } = templatePaiementInitie(data);
    return this.envoyerMail(destinataire, subject, html, text);
  }

  async envoyerPaiementConfirme(destinataire: string, data: EmailPaiement): Promise<boolean> {
    const { subject, html, text } = templatePaiementConfirme(data);
    return this.envoyerMail(destinataire, subject, html, text);
  }

  async envoyerPaiementLibere(destinataire: string, data: EmailPaiement): Promise<boolean> {
    const { subject, html, text } = templatePaiementLibere(data);
    return this.envoyerMail(destinataire, subject, html, text);
  }

  async envoyerAlerteNouvelleConnexion(
    destinataire: string,
    data: EmailNouvelleConnexion,
  ): Promise<boolean> {
    const { subject, html, text } = templateNouvelleConnexion(data);
    return this.envoyerMail(destinataire, subject, html, text);
  }
}

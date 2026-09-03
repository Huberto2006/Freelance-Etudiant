import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
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

/**
 * Service d'envoi d'emails reels via SMTP (Nodemailer).
 *
 * Principes :
 * - Les emails sont SECONDAIRES : une erreur d'envoi ne doit jamais
 *   faire echouer l'action metier (inscription, reset, paiement...).
 *   Les erreurs sont journalisees, jamais propagees.
 * - Si le SMTP n'est pas configure (dev sans credentials), le service
 *   bascule sur un mode "console" explicite et journalise le contenu :
 *   il n'y a plus jamais de fausse impression d'envoi, le mode est
 *   annonce clairement dans les logs.
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
          "SMTP non configure (SMTP_HOST/SMTP_USER/SMTP_PASS absents) : les emails seront journalises en console et non envoyes. Configurez le bloc SMTP dans .env pour l'envoi reel.",
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
  async envoyerMail(destinataire: string, subject: string, html: string, text: string): Promise<boolean> {
    const transporteur = await this.obtenirTransporteur();

    if (!transporteur) {
      // Mode degrade explicite (dev sans SMTP) : on journalise le contenu
      // au lieu de mentir sur un envoi qui n'a pas eu lieu.
      this.logger.log(
        `[EMAIL:MODE-CONSOLE] A: ${destinataire} | Sujet: ${subject}\n${text}`,
      );
      return true;
    }

    try {
      await transporteur.sendMail({
        from: this.expediteur,
        to: destinataire,
        subject,
        html,
        text,
      });
      this.logger.log(`Email envoye a ${destinataire} : ${subject}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Echec d'envoi de l'email a ${destinataire} (${subject}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { nettoyerSujet } from '../../common/utils/html.util';
import type { Transporter } from 'nodemailer';

import {
  EmailCandidatureAccepteeData,
  templateCandidatureAcceptee,
} from './templates/candidature-acceptee.template';
import {
  EmailCandidatureRefuseeData,
  templateCandidatureRefusee,
} from './templates/candidature-refusee.template';
import {
  EmailNouvelleMissionData,
  templateNouvelleMission,
} from './templates/nouvelle-mission.template';

export interface ParamCandidatureEmail {
  email?: string | null;
  nom?: string | null;
  titreMission: string;
  missionId?: string;
}

export interface ParamDestinataireMission {
  email: string;
  nom?: string;
}

export interface ParamNouvelleMission {
  id: string;
  titre: string;
  description: string;
  budget: number;
  categorie?: string;
  dateLimite: Date | string;
}

/**
 * Service indépendant d'envoi d'emails transactionnels Kianja.
 *
 * Principes stricts :
 * 1. Découplage total : ne dépend d'aucune entité ni service de notification interne.
 * 2. Non-bloquant : l'échec d'envoi n'annule jamais l'action métier (logs d'erreur propres).
 * 3. Configuration sécurisée via variables d'environnement (.env).
 * 4. Mode console automatique si les identifiants SMTP ne sont pas configurés (développement).
 * 5. Anti-doublons systématique lors des diffusions groupées.
 */
@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private transporter: Transporter | null = null;
  private smtpConfigure: boolean | null = null;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const rawFrom =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SMTP_FROM') ||
      'no-reply@kianja.mg';

    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') || 'KIANJA';

    // Formate "Nom <email@domaine.mg>" si non déjà présent
    this.fromAddress = rawFrom.includes('<')
      ? rawFrom
      : `"${fromName}" <${rawFrom}>`;

    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  }

  /**
   * Initialise paresseusement le transporteur SMTP à partir des variables d'environnement.
   * Accepte indifféremment MAIL_* et SMTP_* pour une flexibilité maximale.
   */
  private async getTransporter(): Promise<Transporter | null> {
    if (this.smtpConfigure === null) {
      const host =
        this.configService.get<string>('MAIL_HOST') ||
        this.configService.get<string>('SMTP_HOST');
      const user =
        this.configService.get<string>('MAIL_USER') ||
        this.configService.get<string>('SMTP_USER');
      const pass =
        this.configService.get<string>('MAIL_PASSWORD') ||
        this.configService.get<string>('SMTP_PASS');

      this.smtpConfigure = Boolean(host && user && pass);

      if (!this.smtpConfigure) {
        this.logger.warn(
          "SMTP non configuré (MAIL_HOST/MAIL_USER/MAIL_PASSWORD absents) : les emails transactionnels seront journalisés en console sans envoi réseau.",
        );
      }
    }

    if (!this.smtpConfigure) {
      return null;
    }

    if (!this.transporter) {
      const host =
        this.configService.get<string>('MAIL_HOST') ||
        this.configService.get<string>('SMTP_HOST')!;
      const portRaw =
        this.configService.get<string>('MAIL_PORT') ||
        this.configService.get<string>('SMTP_PORT') ||
        '587';
      const port = parseInt(portRaw, 10);
      const secure =
        this.configService.get<string>('MAIL_SECURE') === 'true' ||
        this.configService.get<string>('SMTP_SECURE') === 'true' ||
        port === 465;

      const user =
        this.configService.get<string>('MAIL_USER') ||
        this.configService.get<string>('SMTP_USER')!;
      const pass =
        this.configService.get<string>('MAIL_PASSWORD') ||
        this.configService.get<string>('SMTP_PASS')!;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Envoi de base sécurisé. Ne lève JAMAIS d'exception afin de préserver l'action métier.
   */
  async envoyerMail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    if (!to || !to.includes('@')) {
      this.logger.warn(`Adresse email invalide ignorée : "${to}"`);
      return false;
    }

    const transporter = await this.getTransporter();

    if (!transporter) {
      this.logger.log(
        `[EMAIL:MODE-CONSOLE] Destinataire: ${to} | Sujet: ${subject}\n${text}\n----------------------------------------`,
      );
      return true;
    }

    try {
      await transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: nettoyerSujet(subject),
        html,
        text,
      });
      this.logger.log(`[EMAIL] Envoyé avec succès à ${to} — "${subject}"`);
      return true;
    } catch (error) {
      this.logger.error(
        `[EMAIL:ECHEC] Échec d'envoi à ${to} ("${subject}") : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  // =========================================================================
  // 1. CANDIDATURE ACCEPTÉE
  // =========================================================================
  async sendCandidatureAcceptee(params: ParamCandidatureEmail): Promise<boolean> {
    try {
      if (!params.email) {
        this.logger.warn(
          `Impossible d'envoyer l'email de candidature acceptée : email manquant pour la mission "${params.titreMission}"`,
        );
        return false;
      }

      const lienKianja = `${this.frontendUrl.replace(/\/$/, '')}/tableau-de-bord/candidatures`;

      const data: EmailCandidatureAccepteeData = {
        nom: params.nom || undefined,
        titreMission: params.titreMission,
        lienKianja,
      };

      const { subject, html, text } = templateCandidatureAcceptee(data);
      return await this.envoyerMail(params.email, subject, html, text);
    } catch (err) {
      this.logger.error(
        `Erreur inattendue dans sendCandidatureAcceptee : ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  // =========================================================================
  // 2. CANDIDATURE REFUSÉE
  // =========================================================================
  async sendCandidatureRefusee(params: ParamCandidatureEmail): Promise<boolean> {
    try {
      if (!params.email) {
        this.logger.warn(
          `Impossible d'envoyer l'email de candidature refusée : email manquant pour la mission "${params.titreMission}"`,
        );
        return false;
      }

      const lienKianja = `${this.frontendUrl.replace(/\/$/, '')}/tableau-de-bord/candidatures`;

      const data: EmailCandidatureRefuseeData = {
        nom: params.nom || undefined,
        titreMission: params.titreMission,
        lienKianja,
      };

      const { subject, html, text } = templateCandidatureRefusee(data);
      return await this.envoyerMail(params.email, subject, html, text);
    } catch (err) {
      this.logger.error(
        `Erreur inattendue dans sendCandidatureRefusee : ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  // =========================================================================
  // 3. NOUVELLE MISSION PUBLIÉE (DIFFUSION AUX ÉTUDIANTS CONCERNÉS)
  // =========================================================================
  async sendNouvelleMission(
    destinataires: ParamDestinataireMission[],
    mission: ParamNouvelleMission,
  ): Promise<number> {
    try {
      if (!destinataires || destinataires.length === 0) {
        this.logger.log(
          `Aucun étudiant concerné pour la mission "${mission.titre}". Aucun email envoyé.`,
        );
        return 0;
      }

      // Anti-doublons strict sur l'adresse email
      const emailsTraites = new Set<string>();
      const destinatairesUniques: ParamDestinataireMission[] = [];

      for (const dest of destinataires) {
        const cleanEmail = dest.email?.trim().toLowerCase();
        if (cleanEmail && cleanEmail.includes('@') && !emailsTraites.has(cleanEmail)) {
          emailsTraites.add(cleanEmail);
          destinatairesUniques.push({
            email: cleanEmail,
            nom: dest.nom,
          });
        }
      }

      const lienMission = `${this.frontendUrl.replace(/\/$/, '')}/missions/${mission.id}`;

      // Formater la date limite proprement
      let dateLimiteFormatee: string;
      if (mission.dateLimite instanceof Date) {
        dateLimiteFormatee = mission.dateLimite.toLocaleDateString('fr-FR');
      } else {
        const d = new Date(mission.dateLimite);
        dateLimiteFormatee = isNaN(d.getTime())
          ? String(mission.dateLimite)
          : d.toLocaleDateString('fr-FR');
      }

      let envoisReussis = 0;

      for (const dest of destinatairesUniques) {
        const data: EmailNouvelleMissionData = {
          nom: dest.nom,
          titre: mission.titre,
          description: mission.description,
          categorie: mission.categorie,
          budget: Number(mission.budget),
          dateLimite: dateLimiteFormatee,
          lienMission,
        };

        const { subject, html, text } = templateNouvelleMission(data);
        const succes = await this.envoyerMail(dest.email, subject, html, text);
        if (succes) {
          envoisReussis++;
        }
      }

      this.logger.log(
        `Diffusion nouvelle mission terminée pour "${mission.titre}" : ${envoisReussis}/${destinatairesUniques.length} emails traités.`,
      );

      return envoisReussis;
    } catch (err) {
      this.logger.error(
        `Erreur inattendue dans sendNouvelleMission : ${err instanceof Error ? err.message : String(err)}`,
      );
      return 0;
    }
  }
}

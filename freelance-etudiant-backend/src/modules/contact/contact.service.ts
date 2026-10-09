import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { echapperHtml } from '../../common/utils/html.util';
import { EnvoyerMessageContactDto } from './dto/envoyer-message-contact.dto';

/**
 * Traitement des messages du formulaire public de contact.
 *
 * Principes :
 * - Aucune adresse n'est codee en dur : la destination vient des
 *   variables d'environnement CONTACT_MAIL_TO (nom canonique) et,
 *   pour compatibilite, CONTACT_EMAIL.
 * - Le service refuse de repondre « succes » quand rien n'a pu etre
 *   envoye : si la destination ou le SMTP (SMTP_HOST/SMTP_USER/SMTP_PASS)
 *   ne sont pas configures, ou si l'envoi echoue, une erreur 503 est
 *   retournee. Le mode « console » d'EmailService (qui journalise sans
 *   envoyer) n'est volontairement PAS accepte ici : un visiteur ne doit
 *   jamais croire que son message est parti alors qu'il n'est que dans
 *   les logs.
 * - Tout contenu saisi par le visiteur est echappe avant insertion dans
 *   le HTML (anti-phishing / injection).
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async envoyer(dto: EnvoyerMessageContactDto): Promise<{ message: string }> {
    // Honeypot : on repond comme en cas de succes pour ne rien reveler
    // aux robots, sans rien envoyer.
    if (dto.siteWeb && dto.siteWeb.trim().length > 0) {
      this.logger.warn('Message de contact ignore (champ piege renseigne)');
      return { message: 'Votre message a bien ete envoye.' };
    }

    const destinataire =
      this.configService.get<string>('CONTACT_MAIL_TO') ||
      this.configService.get<string>('CONTACT_EMAIL');
    const smtpConfigure = Boolean(
      this.configService.get<string>('SMTP_HOST') &&
        this.configService.get<string>('SMTP_USER') &&
        this.configService.get<string>('SMTP_PASS'),
    );

    if (!destinataire || !smtpConfigure) {
      this.logger.error(
        'Formulaire de contact indisponible : CONTACT_MAIL_TO/CONTACT_EMAIL et/ou le bloc SMTP ne sont pas configures dans .env.',
      );
      throw new ServiceUnavailableException(
        "Le service de contact n'est pas encore disponible. Veuillez reessayer plus tard.",
      );
    }

    const nom = echapperHtml(dto.nom);
    const email = echapperHtml(dto.email);
    const sujet = echapperHtml(dto.sujet);
    const corps = echapperHtml(dto.message).replace(/\r?\n/g, '<br>');

    const html = `
      <p><strong>Nouveau message depuis le formulaire de contact Kianja</strong></p>
      <p><strong>Nom :</strong> ${nom}<br>
      <strong>E-mail :</strong> ${email}<br>
      <strong>Sujet :</strong> ${sujet}</p>
      <p>${corps}</p>
    `;
    const text = [
      'Nouveau message depuis le formulaire de contact Kianja',
      `Nom : ${dto.nom}`,
      `E-mail : ${dto.email}`,
      `Sujet : ${dto.sujet}`,
      '',
      dto.message,
    ].join('\n');

    const envoye = await this.emailService.envoyerMail(
      destinataire,
      `[Contact Kianja] ${dto.sujet}`,
      html,
      text,
      dto.email,
    );

    if (!envoye) {
      throw new ServiceUnavailableException(
        "Votre message n'a pas pu etre envoye. Veuillez reessayer plus tard.",
      );
    }

    return { message: 'Votre message a bien ete envoye.' };
  }
}

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/** Identite Google validee (jamais issue directement du navigateur). */
export interface IdentiteGoogle {
  /** Identifiant Google stable (claim `sub`). */
  sub: string;
  email: string;
  nom: string;
}

const ERREURS_RESEAU = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
]);

/**
 * Validation cryptographique du jeton d'identite Google via la bibliotheque
 * officielle `google-auth-library` : signature (cles publiques Google),
 * expiration, emetteur (`iss`) et audience (`aud` = notre Client ID).
 * On controle en plus `email_verified` et la presence de `sub`.
 * Aucun jeton n'est journalise.
 */
@Injectable()
export class GoogleTokenVerifierService {
  private readonly logger = new Logger(GoogleTokenVerifierService.name);
  private client: OAuth2Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  private clientId(): string {
    const clientId = this.configService.get<string | null>('google.clientId');
    if (!clientId) {
      throw new ServiceUnavailableException(
        "La connexion avec Google n'est pas disponible pour le moment.",
      );
    }
    return clientId;
  }

  async verifier(idToken: string): Promise<IdentiteGoogle> {
    const clientId = this.clientId();
    this.client ??= new OAuth2Client(clientId);

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const nom = (error as { name?: string })?.name;
      if (
        (typeof code === 'string' && ERREURS_RESEAU.has(code)) ||
        nom === 'GaxiosError'
      ) {
        // Impossible de joindre Google pour recuperer les cles : ce n'est
        // pas la faute de l'utilisateur, reponse controlee sans details.
        this.logger.warn('Cles publiques Google injoignables');
        throw new ServiceUnavailableException(
          'Google est momentanement injoignable. Reessayez dans quelques instants.',
        );
      }
      throw new UnauthorizedException('Jeton Google invalide ou expire');
    }

    // Controle explicite de l'emetteur (defense en profondeur).
    const emetteursValides = [
      'accounts.google.com',
      'https://accounts.google.com',
    ];
    if (
      !payload ||
      !payload.iss ||
      !emetteursValides.includes(payload.iss) ||
      !payload.sub ||
      !payload.email
    ) {
      throw new UnauthorizedException('Jeton Google invalide ou expire');
    }
    if (payload.email_verified !== true) {
      throw new UnauthorizedException(
        "L'adresse email de ce compte Google n'est pas verifiee par Google.",
      );
    }

    const email = payload.email.trim().toLowerCase();
    const nom =
      (typeof payload.name === 'string' && payload.name.trim()) ||
      email.split('@')[0];

    return { sub: payload.sub, email, nom: nom.slice(0, 100) };
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/** Reponse de l'API Siteverify de Cloudflare (champs utilises). */
interface ReponseSiteverify {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

export interface OptionsVerificationTurnstile {
  /** IP du client (optionnelle, renforce l'evaluation Cloudflare). */
  ip?: string;
  /** Actions acceptees ; ignore si le controle de contexte est inactif. */
  actionsAttendues?: string[];
}

/** Longueur maximale d'un jeton Turnstile (documentation Cloudflare). */
const LONGUEUR_MAX_JETON = 2048;

/** Codes Cloudflare qui indiquent un probleme de CONFIGURATION serveur. */
const CODES_CONFIGURATION = new Set([
  'missing-input-secret',
  'invalid-input-secret',
]);

/**
 * Verification serveur des jetons Turnstile aupres de Cloudflare Siteverify.
 * Seule cette verification autorise la suite de l'operation : la simple
 * presence d'un jeton dans la requete ne prouve rien. Politique fail-closed :
 * toute erreur reseau, delai depasse ou reponse invalide REFUSE l'operation.
 * Ni le jeton ni la cle secrete ne sont jamais journalises.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly configService: ConfigService) {}

  async verifier(
    jeton: string | undefined | null,
    options: OptionsVerificationTurnstile = {},
  ): Promise<void> {
    if (!jeton || typeof jeton !== 'string' || jeton.trim() === '') {
      throw new BadRequestException(
        'Verification anti-robot requise. Veuillez la completer puis reessayer.',
      );
    }
    if (jeton.length > LONGUEUR_MAX_JETON) {
      throw new BadRequestException('Verification anti-robot invalide.');
    }

    const secretKey = this.configService.getOrThrow<string>('turnstile.secretKey');
    const verifyUrl = this.configService.getOrThrow<string>('turnstile.verifyUrl');
    const timeoutMs = this.configService.getOrThrow<number>('turnstile.timeoutMs');

    const corps: Record<string, string> = {
      secret: secretKey,
      response: jeton,
      // Cle d'idempotence unique : chaque verification est une tentative
      // distincte (le jeton reste a usage unique cote Cloudflare).
      idempotency_key: crypto.randomUUID(),
    };
    if (options.ip) corps.remoteip = options.ip;

    let reponse: ReponseSiteverify;
    try {
      const http = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!http.ok) {
        this.logger.warn(`Siteverify a repondu HTTP ${http.status}`);
        throw this.indisponible();
      }
      reponse = (await http.json()) as ReponseSiteverify;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      // Timeout, erreur reseau ou corps non JSON : fail-closed.
      this.logger.warn(
        `Echec de l'appel Siteverify : ${error instanceof Error ? error.name : 'erreur inconnue'}`,
      );
      throw this.indisponible();
    }

    if (
      !reponse ||
      typeof reponse !== 'object' ||
      typeof reponse.success !== 'boolean'
    ) {
      this.logger.warn('Reponse Siteverify inexploitable');
      throw this.indisponible();
    }

    if (!reponse.success) {
      const codes = reponse['error-codes'] ?? [];
      if (codes.some((code) => CODES_CONFIGURATION.has(code))) {
        // Secret invalide : erreur serveur, pas une erreur utilisateur.
        this.logger.error(
          'TURNSTILE_SECRET_KEY refusee par Cloudflare : verifier la configuration.',
        );
        throw this.indisponible();
      }
      if (codes.includes('timeout-or-duplicate')) {
        throw new BadRequestException(
          'La verification anti-robot a expire ou a deja ete utilisee. Veuillez la refaire.',
        );
      }
      throw new BadRequestException(
        'Verification anti-robot echouee. Veuillez reessayer.',
      );
    }

    this.verifierContexte(reponse, options);
  }

  /** Controle hostname + action (actif selon turnstile.enforceContext). */
  private verifierContexte(
    reponse: ReponseSiteverify,
    options: OptionsVerificationTurnstile,
  ): void {
    if (!this.configService.get<boolean>('turnstile.enforceContext')) return;

    const hostnames =
      this.configService.get<string[]>('turnstile.hostnames') ?? [];
    const hostname = reponse.hostname?.toLowerCase();
    if (hostnames.length > 0 && (!hostname || !hostnames.includes(hostname))) {
      this.logger.warn('Jeton Turnstile emis pour un hostname non autorise');
      throw new BadRequestException('Verification anti-robot invalide.');
    }

    const actions = options.actionsAttendues ?? [];
    if (
      actions.length > 0 &&
      (!reponse.action || !actions.includes(reponse.action))
    ) {
      this.logger.warn('Jeton Turnstile emis pour une action differente');
      throw new BadRequestException('Verification anti-robot invalide.');
    }
  }

  private indisponible(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'Verification anti-robot momentanement indisponible. Reessayez dans quelques instants.',
    );
  }
}

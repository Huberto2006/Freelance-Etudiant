import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Client de l'API MVola (Telma Madagascar) - paiements C2B en ligne.
 *
 * L'API MVola est exposee via le portail developpeur developer.mvola.mg
 * (WSO2 API Manager). Flux officiel :
 *
 *   1. OAuth2 client_credentials : POST {base}/token
 *      (Authorization: Basic consumerKey:consumerSecret)
 *   2. Initiation du paiement : PUT {base}/mvola/mm/transactions/type/1/1/1.0.0/{transactionReference}
 *      -> reponse { serverCorrelationId, transactionStatus: "Pending" }
 *   3. Verification du statut : GET {base}/mvola/mm/transactions/type/1/1/1.0.0/{serverCorrelationId}/status
 *      -> transactionStatus: "Pending" | "Completed" | "Failed"
 *
 * Notes de securite :
 * - MVola ne notifie PAS la plateforme (pas de webhook sortant) : c'est
 *   le BACKEND qui verifie le statut aupres du fournisseur (polling
 *   serveur). Le frontend n'a jamais la capacite de marquer un
 *   paiement "confirme".
 * - Le montant est envoye au fournisseur lors de l'initiation : un
 *   montant falsifie cote client ne peut pas produire un paiement
 *   confirme pour un montant different.
 * - Sandbox : https://devapi.mvola.mg (compte developpeur gratuit,
 *   application + abonnement "MVola API" + cle API).
 * - Devise : "Ar" (Ariary). Compte marchand : partnerId (numero MVola
 *   marchand) + partnerName + apiKey.
 */
@Injectable()
export class MvolaService {
  private readonly logger = new Logger(MvolaService.name);

  private readonly baseUrl: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly apiKey: string;
  private readonly partnerId: string;
  private readonly partnerName: string;
  private readonly userAccountOrigin: string;

  private jeton: string | null = null;
  private jetonExpireA = 0;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('MVOLA_BASE_URL') ||
      'https://devapi.mvola.mg';
    this.consumerKey = this.configService.get<string>('MVOLA_CONSUMER_KEY') || '';
    this.consumerSecret =
      this.configService.get<string>('MVOLA_CONSUMER_SECRET') || '';
    this.apiKey = this.configService.get<string>('MVOLA_API_KEY') || '';
    this.partnerId = this.configService.get<string>('MVOLA_PARTNER_ID') || '';
    this.partnerName =
      this.configService.get<string>('MVOLA_PARTNER_NAME') || '';
    this.userAccountOrigin =
      this.configService.get<string>('MVOLA_USER_ACCOUNT_ORIGIN') || '034';
  }

  /** Indique si le paiement MVola en ligne est actif (credentials presents). */
  get estConfigure(): boolean {
    return Boolean(
      this.consumerKey && this.consumerSecret && this.apiKey && this.partnerId,
    );
  }

  /** Erreur explicite quand le module n'est pas configure. */
  private assertConfigure(): void {
    if (!this.estConfigure) {
      throw new Error(
        'Paiement MVola non configure : renseignez MVOLA_CONSUMER_KEY, MVOLA_CONSUMER_SECRET, MVOLA_API_KEY et MVOLA_PARTNER_ID dans .env',
      );
    }
  }

  /**
   * Jeton OAuth2 (client_credentials), mis en cache jusqu'a
   * expiration (expire_in = 3600 s par defaut).
   */
  private async obtenirJeton(): Promise<string> {
    this.assertConfigure();

    if (this.jeton && Date.now() < this.jetonExpireA - 60_000) {
      return this.jeton;
    }

    const basic = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`,
    ).toString('base64');

    const reponse = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });

    if (!reponse.ok) {
      const detail = await reponse.text();
      this.logger.error(`MVola token KO (${reponse.status}) : ${detail}`);
      throw new Error('Authentification MVola impossible');
    }

    const data = (await reponse.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) {
      throw new Error("Reponse MVola sans jeton d'acces");
    }

    this.jeton = data.access_token;
    this.jetonExpireA = Date.now() + (data.expires_in ?? 3600) * 1000;
    return this.jeton;
  }

  /**
   * Initie un paiement C2B : demande au client MVola de confirmer le
   * debit de son numero vers le compte marchand. Retourne le
   * serverCorrelationId servant a la verification ulterieure.
   */
  async initierPaiement(params: {
    montantAr: number;
    transactionReference: string;
    telephoneDebite: string;
    description: string;
  }): Promise<{ serverCorrelationId: string; statut: string }> {
    this.assertConfigure();

    const jeton = await this.obtenirJeton();
    const url = `${this.baseUrl}/mvola/mm/transactions/type/1/1/1.0.0/${params.transactionReference}`;

    const reponse = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${jeton}`,
        Version: '1.0.0',
        'X-CorrelationID': params.transactionReference,
        UserLanguage: 'FR',
        UserAccountOrigin: this.userAccountOrigin,
        partnerId: this.partnerId,
        partnerName: this.partnerName,
        apiKey: this.apiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        amount: String(params.montantAr),
        currency: 'Ar',
        descriptionText: params.description.slice(0, 250),
        fee: '0',
        receivingPsp: '03401',
        transferType: 'immediat',
        debitedParty: params.telephoneDebite,
        creditedParty: this.partnerId,
      }),
    });

    const texte = await reponse.text();
    if (!reponse.ok) {
      this.logger.error(`MVola initiation KO (${reponse.status}) : ${texte}`);
      throw new Error(
        `Initiation du paiement MVola refusee par le fournisseur (${reponse.status})`,
      );
    }

    const data = JSON.parse(texte || '{}') as {
      serverCorrelationId?: string;
      transactionStatus?: string;
    };
    if (!data.serverCorrelationId) {
      throw new Error('Reponse MVola sans serverCorrelationId');
    }

    this.logger.log(
      `Paiement MVola initie : ref=${params.transactionReference}, corrId=${data.serverCorrelationId}, statut=${data.transactionStatus ?? '?'}`,
    );
    return {
      serverCorrelationId: data.serverCorrelationId,
      statut: data.transactionStatus ?? 'Pending',
    };
  }

  /**
   * Statut normalise d'une transaction MVola (polling serveur).
   * Retourne 'completed' | 'pending' | 'failed'.
   */
  async verifierStatut(
    serverCorrelationId: string,
  ): Promise<'completed' | 'pending' | 'failed'> {
    this.assertConfigure();

    const jeton = await this.obtenirJeton();
    const url = `${this.baseUrl}/mvola/mm/transactions/type/1/1/1.0.0/${serverCorrelationId}/status`;

    const reponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jeton}`,
        Version: '1.0.0',
        UserLanguage: 'FR',
        UserAccountOrigin: this.userAccountOrigin,
        partnerId: this.partnerId,
        partnerName: this.partnerName,
        apiKey: this.apiKey,
        'Cache-Control': 'no-cache',
      },
    });

    const texte = await reponse.text();
    if (!reponse.ok) {
      this.logger.error(`MVola statut KO (${reponse.status}) : ${texte}`);
      throw new Error(
        `Verification du paiement MVola impossible (${reponse.status})`,
      );
    }

    const data = JSON.parse(texte || '{}') as { transactionStatus?: string };
    const brut = (data.transactionStatus ?? '').toLowerCase();

    if (brut === 'completed' || brut === 'success' || brut === 'successful') {
      return 'completed';
    }
    if (brut === 'failed' || brut === 'rejected' || brut === 'expired') {
      return 'failed';
    }
    return 'pending';
  }
}

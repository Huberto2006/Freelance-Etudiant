import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Statut normalise d'un paiement, commun a tous les fournisseurs. */
export type StatutFournisseur = 'completed' | 'pending' | 'failed';

/**
 * Client de la passerelle de paiement Papi (https://papi.mg) :
 * mobile money (MVola, Orange Money, Airtel Money) et carte Visa derriere
 * une seule API REST.
 *
 * Flux (documentation Papi, vue d'ensemble) :
 *   1. le backend cree une demande de paiement (montant calcule COTE SERVEUR) ;
 *   2. Papi renvoie un lien de paiement securise ;
 *   3. le client est redirige et paie sur la page Papi ;
 *   4. Kianja est notifie (webhook signe HMAC-SHA256) ET le backend relit le
 *      statut aupres de Papi : le statut annonce par une notification n'est
 *      jamais cru (voir PaiementsService.traiterWebhookEnLigne).
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ A VERIFIER AVEC LA DOCUMENTATION PAPI                                │
 * │ La vue d'ensemble de la documentation ne precise PAS les chemins, les│
 * │ noms de champs ni l'en-tete d'authentification. Tout ce qui depend de│
 * │ ces details est isole dans ce fichier (constantes ci-dessous,        │
 * │ `construireCorps`, `lireCreation`, `normaliserStatut`) et les chemins│
 * │ / en-tetes sont reglables par variables d'environnement. Aucun appel │
 * │ reel a Papi n'a ete execute lors du developpement : seuls des tests  │
 * │ avec un faux `fetch` ont ete passes.                                 │
 * └──────────────────────────────────────────────────────────────────────┘
 */
@Injectable()
export class PapiService {
  private readonly logger = new Logger(PapiService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly cheminCreation: string;
  private readonly cheminStatut: string;
  private readonly enteteAuth: string;
  private readonly schemeAuth: string;
  private readonly devise: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (this.configService.get<string>('PAPI_BASE_URL') || '')
      .trim()
      .replace(/\/+$/, '');
    this.apiKey = (this.configService.get<string>('PAPI_API_KEY') || '').trim();

    // ASSUMPTIONS (a confirmer dans la doc Papi) :
    this.cheminCreation =
      this.configService.get<string>('PAPI_CREATE_PATH') || '/payments';
    this.cheminStatut =
      this.configService.get<string>('PAPI_STATUS_PATH') || '/payments/{id}';
    this.enteteAuth =
      this.configService.get<string>('PAPI_AUTH_HEADER') || 'Authorization';
    this.schemeAuth =
      this.configService.get<string | undefined>('PAPI_AUTH_SCHEME') ?? 'Bearer';
    this.devise = this.configService.get<string>('PAPI_CURRENCY') || 'MGA';
  }

  /** Papi est actif seulement si URL de base ET cle API sont renseignees. */
  get estConfigure(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  private assertConfigure(): void {
    if (!this.estConfigure) {
      throw new Error(
        'Paiement Papi non configure : renseignez PAPI_BASE_URL et PAPI_API_KEY dans .env',
      );
    }
  }

  private entetes(extra: Record<string, string> = {}): Record<string, string> {
    const valeur = this.schemeAuth
      ? `${this.schemeAuth} ${this.apiKey}`
      : this.apiKey;
    return {
      [this.enteteAuth]: valeur,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  /** Corps de la demande de paiement. Noms de champs : a confirmer. */
  private construireCorps(params: ParamsCreation): Record<string, unknown> {
    return {
      amount: params.montantAr,
      currency: this.devise,
      reference: params.reference,
      description: params.description.slice(0, 250),
      returnUrl: params.urlRetour,
      ...(params.urlNotification
        ? { notificationUrl: params.urlNotification }
        : {}),
    };
  }

  /** Extrait identifiant + lien de la reponse de creation. Champs : a confirmer. */
  private lireCreation(data: Record<string, unknown>): {
    idFournisseur: string;
    lienPaiement: string;
    statut: string;
  } {
    const texte = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : undefined;

    const idFournisseur = texte(data.id) ?? texte(data.paymentId);
    const lienPaiement =
      texte(data.paymentUrl) ??
      texte(data.payment_url) ??
      texte(data.checkoutUrl) ??
      texte(data.url) ??
      texte(data.link);

    if (!idFournisseur || !lienPaiement) {
      throw new Error('Reponse Papi sans identifiant ou sans lien de paiement');
    }

    // Le lien est ensuite affiche au client et utilise pour une redirection :
    // on refuse tout ce qui n'est pas un URL https valide.
    let url: URL;
    try {
      url = new URL(lienPaiement);
    } catch {
      throw new Error('Lien de paiement Papi invalide');
    }
    if (url.protocol !== 'https:' && !this.autoriseHttp(url)) {
      throw new Error('Lien de paiement Papi non securise (https requis)');
    }

    return {
      idFournisseur,
      lienPaiement: url.toString(),
      statut: texte(data.status) ?? 'pending',
    };
  }

  /** http toleree uniquement vers localhost (bac a sable local). */
  private autoriseHttp(url: URL): boolean {
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  }

  /**
   * Statut brut du fournisseur -> statut normalise. Tout statut inconnu est
   * traite comme « en attente » : jamais de confirmation par defaut.
   */
  normaliserStatut(brut: unknown): StatutFournisseur {
    const valeur = typeof brut === 'string' ? brut.trim().toLowerCase() : '';
    if (['completed', 'paid', 'success', 'succeeded', 'successful'].includes(valeur)) {
      return 'completed';
    }
    if (
      ['failed', 'cancelled', 'canceled', 'expired', 'rejected', 'declined'].includes(valeur)
    ) {
      return 'failed';
    }
    return 'pending';
  }

  /**
   * Cree une demande de paiement. La cle d'idempotence est la reference
   * Kianja : un nouvel essai reseau ne cree jamais deux transactions.
   */
  async creerPaiement(params: ParamsCreation): Promise<{
    idFournisseur: string;
    lienPaiement: string;
    statut: string;
  }> {
    this.assertConfigure();

    const reponse = await fetch(`${this.baseUrl}${this.cheminCreation}`, {
      method: 'POST',
      headers: this.entetes({ 'Idempotency-Key': params.reference }),
      body: JSON.stringify(this.construireCorps(params)),
    });

    const texte = await reponse.text();
    if (!reponse.ok) {
      // Le corps d'erreur peut contenir des details internes : journal
      // serveur uniquement, jamais renvoye au client.
      this.logger.error(`Papi creation KO (${reponse.status}) : ${texte}`);
      throw new Error(`Creation du paiement Papi refusee (${reponse.status})`);
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(texte || '{}') as Record<string, unknown>;
    } catch {
      throw new Error('Reponse Papi illisible');
    }
    // Certaines API enveloppent la reponse dans { data: {...} }.
    const charge =
      data.data && typeof data.data === 'object' && !Array.isArray(data.data)
        ? (data.data as Record<string, unknown>)
        : data;

    const resultat = this.lireCreation(charge);
    this.logger.log(
      `Paiement Papi cree : ref=${params.reference}, id=${resultat.idFournisseur}`,
    );
    return resultat;
  }

  /** Relit le statut reel d'un paiement aupres de Papi (source de verite). */
  async verifierStatut(idFournisseur: string): Promise<StatutFournisseur> {
    this.assertConfigure();

    const chemin = this.cheminStatut.replace(
      '{id}',
      encodeURIComponent(idFournisseur),
    );
    const reponse = await fetch(`${this.baseUrl}${chemin}`, {
      method: 'GET',
      headers: this.entetes(),
    });

    const texte = await reponse.text();
    if (!reponse.ok) {
      this.logger.error(`Papi statut KO (${reponse.status}) : ${texte}`);
      throw new Error(`Verification du paiement Papi impossible (${reponse.status})`);
    }

    const data = JSON.parse(texte || '{}') as Record<string, unknown>;
    const charge =
      data.data && typeof data.data === 'object' && !Array.isArray(data.data)
        ? (data.data as Record<string, unknown>)
        : data;
    return this.normaliserStatut(charge.status);
  }
}

export interface ParamsCreation {
  montantAr: number;
  reference: string;
  description: string;
  urlRetour: string;
  urlNotification?: string;
}

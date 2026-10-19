import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Statut normalise d'un paiement, commun a tous les fournisseurs. */
export type StatutFournisseur = 'completed' | 'pending' | 'failed';

/**
 * Nature d'un echec Papi, pour distinguer en interne (logs, decisions) :
 * - configuration    : variable manquante/invalide, aucun appel emis ;
 * - parametres       : parametres de paiement invalides, aucun appel emis ;
 * - http             : Papi a repondu par un code d'erreur ;
 * - reseau           : timeout / erreur reseau (resultat externe INCERTAIN) ;
 * - reponse_invalide : HTTP 2xx mais corps inexploitable (le lien a peut-etre
 *                      ete cree : resultat externe INCERTAIN).
 */
export type NatureErreurPapi =
  | 'configuration'
  | 'parametres'
  | 'http'
  | 'reseau'
  | 'reponse_invalide';

/**
 * Erreur technique Papi. `refusDefinitif` n'est vrai que lorsque Papi a
 * clairement REFUSE la demande (HTTP 4xx hors 408/429) : aucun lien n'a pu
 * etre cree, la transaction peut etre annulee sans risque. Dans tous les
 * autres cas le resultat externe est incertain et la transaction n'est
 * jamais declaree echouee.
 */
export class PapiError extends Error {
  constructor(
    readonly nature: NatureErreurPapi,
    message: string,
    readonly options: { statutHttp?: number; refusDefinitif?: boolean } = {},
  ) {
    super(message);
    this.name = 'PapiError';
  }

  get statutHttp(): number | undefined {
    return this.options.statutHttp;
  }

  get refusDefinitif(): boolean {
    return this.options.refusDefinitif === true;
  }
}

export interface ParamsCreation {
  /** Montant en Ariary, calcule cote serveur. */
  montantAr: number;
  /** Reference marchande Kianja (cle d'idempotence cote Papi). */
  reference: string;
  /** Nom du client (champ `clientName`, obligatoire). */
  nomClient: string;
  description: string;
  urlSucces: string;
  urlEchec: string;
  urlNotification?: string;
}

export interface ResultatCreation {
  /** `data.paymentLink` : lien de paiement a ouvrir par le client. */
  lienPaiement: string;
  /** `data.paymentReference` : reference cote Papi. */
  referencePapi: string;
  devise?: string;
}

/** Limites appliquees avant l'envoi (Papi ne les documente pas dans nos sources). */
const LONGUEUR_MAX_NOM = 100;
const LONGUEUR_MAX_DESCRIPTION = 250;
const LONGUEUR_MAX_REFERENCE = 100;
const DELAI_PAR_DEFAUT_MS = 15_000;

/** Contrat Papi (fourni par le projet, voir PAPI-INTEGRATION.md). */
const BASE_URL_PAR_DEFAUT = 'https://app.papi.mg/engine/api';
const CHEMIN_CREATION_PAR_DEFAUT = '/payment-links';
const ENTETE_AUTH_PAR_DEFAUT = 'Token';

/**
 * Client de la passerelle de paiement Papi (https://papi.mg).
 *
 * Contrat de CREATION utilise (fourni dans le cahier des charges du projet) :
 *   POST {PAPI_BASE_URL}/payment-links   (defaut https://app.papi.mg/engine/api)
 *   en-tete  `Token: <cle API>`  (sans prefixe)
 *   corps    { amount, reference, clientName, description,
 *              successUrl, failureUrl, notificationUrl }
 *   reponse  { data: { paymentLink, paymentReference, currency, amount } }
 *
 * NON confirme par nos sources (donc non invente par defaut) :
 *   - le chemin de lecture du statut : `PAPI_STATUS_PATH` est OBLIGATOIRE pour
 *     verifier un paiement (placeholders {paymentReference} / {reference}) ;
 *     sans lui, aucun paiement Papi ne peut etre confirme (echec ferme) ;
 *   - le nom exact du champ de statut et de ses valeurs : lecture de
 *     `data.status` (ou `status`) ; tout statut inconnu = « en attente ».
 */
@Injectable()
export class PapiService implements OnModuleInit {
  private readonly logger = new Logger(PapiService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly cheminCreation: string;
  private readonly cheminStatut: string | undefined;
  private readonly enteteAuth: string;
  private readonly schemeAuth: string;
  private readonly delaiMs: number;
  private readonly production: boolean;

  constructor(private readonly configService: ConfigService) {
    const lire = (cle: string) => this.configService.get<string>(cle)?.trim();

    this.baseUrl = (lire('PAPI_BASE_URL') || BASE_URL_PAR_DEFAUT).replace(/\/+$/, '');
    this.apiKey = lire('PAPI_API_KEY') || '';
    this.cheminCreation = lire('PAPI_CREATE_PATH') || CHEMIN_CREATION_PAR_DEFAUT;
    this.cheminStatut = lire('PAPI_STATUS_PATH') || undefined;
    this.enteteAuth = lire('PAPI_AUTH_HEADER') || ENTETE_AUTH_PAR_DEFAUT;
    // Defaut : cle seule, sans « Bearer » (en-tete `Token`).
    this.schemeAuth = lire('PAPI_AUTH_SCHEME') ?? '';
    const delai = Number(lire('PAPI_TIMEOUT_MS'));
    this.delaiMs = Number.isFinite(delai) && delai > 0 ? delai : DELAI_PAR_DEFAUT_MS;
    this.production = lire('NODE_ENV') === 'production';
  }

  /** Journalise au demarrage l'etat de la configuration (jamais de secret). */
  onModuleInit(): void {
    const { problemes } = this.diagnostic();
    if (problemes.length > 0) {
      this.logger.warn(
        `Configuration Papi incomplete : ${problemes.join(' ; ')}. Le paiement Papi restera indisponible ; les autres moyens de paiement ne sont pas affectes.`,
      );
    } else {
      this.logger.log(
        `Papi configure (base=${this.baseUrl}, en-tete=${this.enteteAuth}, statut=${this.cheminStatut ? 'configure' : 'NON configure'})`,
      );
    }
  }

  /**
   * Controle de configuration SANS secret : liste de problemes lisibles.
   * En production, les URL publiques (retour et notification) doivent etre
   * en https et ne pas pointer vers localhost.
   */
  diagnostic(): { ok: boolean; problemes: string[] } {
    const problemes: string[] = [];

    if (!this.apiKey) problemes.push('PAPI_API_KEY absente');

    const baseOk = this.urlValide(this.baseUrl, false);
    if (!baseOk) problemes.push('PAPI_BASE_URL invalide (https requis)');

    if (this.production) {
      const frontend = this.configService.get<string>('FRONTEND_URL')?.trim();
      if (!frontend || !this.urlPubliqueHttps(frontend)) {
        problemes.push('FRONTEND_URL doit etre une URL https publique en production');
      }
      const api = this.configService.get<string>('API_PUBLIC_URL')?.trim();
      if (!api || !this.urlPubliqueHttps(api)) {
        problemes.push('API_PUBLIC_URL doit etre une URL https publique en production');
      }
    }

    return { ok: problemes.length === 0, problemes };
  }

  /** Papi est utilisable si la configuration minimale est valide. */
  get estConfigure(): boolean {
    return this.diagnostic().ok;
  }

  /** Vrai si la verification de statut est possible (chemin configure). */
  get verificationDisponible(): boolean {
    return Boolean(this.cheminStatut);
  }

  private urlValide(valeur: string, autoriserLocalHttp = true): boolean {
    try {
      const url = new URL(valeur);
      if (url.protocol === 'https:') return true;
      return (
        autoriserLocalHttp &&
        !this.production &&
        url.protocol === 'http:' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      );
    } catch {
      return false;
    }
  }

  private urlPubliqueHttps(valeur: string): boolean {
    try {
      const url = new URL(valeur);
      return (
        url.protocol === 'https:' &&
        !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
      );
    } catch {
      return false;
    }
  }

  private assertConfigure(): void {
    const { ok, problemes } = this.diagnostic();
    if (!ok) {
      throw new PapiError(
        'configuration',
        `Configuration Papi invalide : ${problemes.join(' ; ')}`,
      );
    }
  }

  private entetes(): Record<string, string> {
    const valeur = this.schemeAuth ? `${this.schemeAuth} ${this.apiKey}` : this.apiKey;
    return {
      [this.enteteAuth]: valeur,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /** fetch avec delai maximal ; toute erreur reseau devient PapiError('reseau'). */
  private async appeler(
    url: string,
    init: RequestInit,
    etape: string,
  ): Promise<{ statut: number; ok: boolean; texte: string }> {
    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), this.delaiMs);
    try {
      const reponse = await fetch(url, { ...init, signal: controleur.signal });
      const texte = await reponse.text();
      return { statut: reponse.status, ok: reponse.ok, texte };
    } catch (error) {
      const delaiDepasse = error instanceof Error && error.name === 'AbortError';
      throw new PapiError(
        'reseau',
        delaiDepasse
          ? `Delai depasse (${this.delaiMs} ms) pendant : ${etape}`
          : `Erreur reseau pendant : ${etape}`,
      );
    } finally {
      clearTimeout(minuteur);
    }
  }

  /** JSON -> objet ; null si le corps n'est pas un objet JSON. */
  private lireObjet(texte: string): Record<string, unknown> | null {
    try {
      const valeur: unknown = JSON.parse(texte);
      return valeur && typeof valeur === 'object' && !Array.isArray(valeur)
        ? (valeur as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private erreurHttp(etape: string, statut: number): PapiError {
    // 4xx = demande refusee (rien cree), sauf 408/429 : on ne sait pas.
    const refusDefinitif = statut >= 400 && statut < 500 && statut !== 408 && statut !== 429;
    return new PapiError('http', `Papi a repondu HTTP ${statut} pendant : ${etape}`, {
      statutHttp: statut,
      refusDefinitif,
    });
  }

  /** Valide les parametres AVANT tout appel reseau. */
  private validerParams(params: ParamsCreation): void {
    if (!Number.isFinite(params.montantAr) || params.montantAr <= 0) {
      throw new PapiError('parametres', 'Montant invalide (nombre strictement positif requis)');
    }
    if (!params.reference?.trim() || params.reference.length > LONGUEUR_MAX_REFERENCE) {
      throw new PapiError('parametres', 'Reference marchande manquante ou trop longue');
    }
    if (!params.nomClient?.trim()) {
      throw new PapiError('parametres', 'Nom du client manquant (clientName obligatoire)');
    }
    if (!params.description?.trim()) {
      throw new PapiError('parametres', 'Description manquante');
    }
    for (const [nom, valeur] of [
      ['successUrl', params.urlSucces],
      ['failureUrl', params.urlEchec],
    ] as const) {
      if (!valeur || !this.urlValide(valeur)) {
        throw new PapiError('parametres', `${nom} invalide`);
      }
    }
    if (params.urlNotification && !this.urlValide(params.urlNotification)) {
      throw new PapiError('parametres', 'notificationUrl invalide');
    }
  }

  /**
   * Cree un lien de paiement. La reference marchande est envoyee a Papi,
   * dont la creation est documentee comme idempotente : rejouer la meme
   * reference ne cree pas deux transactions. Aucune nouvelle tentative
   * automatique n'est faite ici.
   */
  async creerPaiement(params: ParamsCreation): Promise<ResultatCreation> {
    this.assertConfigure();
    this.validerParams(params);

    const corps: Record<string, unknown> = {
      amount: params.montantAr,
      reference: params.reference,
      clientName: params.nomClient.trim().slice(0, LONGUEUR_MAX_NOM),
      description: params.description.trim().slice(0, LONGUEUR_MAX_DESCRIPTION),
      successUrl: params.urlSucces,
      failureUrl: params.urlEchec,
      ...(params.urlNotification ? { notificationUrl: params.urlNotification } : {}),
    };

    const reponse = await this.appeler(
      `${this.baseUrl}${this.cheminCreation}`,
      { method: 'POST', headers: this.entetes(), body: JSON.stringify(corps) },
      'creation du lien de paiement',
    );

    if (!reponse.ok) {
      // Le corps d'erreur n'est journalise que tronque et jamais renvoye au client.
      this.logger.error(
        `Papi creation KO : HTTP ${reponse.statut}, ref=${params.reference}, corps=${reponse.texte.slice(0, 300)}`,
      );
      throw this.erreurHttp('creation du lien de paiement', reponse.statut);
    }

    const racine = this.lireObjet(reponse.texte);
    if (!racine) {
      throw new PapiError('reponse_invalide', 'Reponse de creation Papi : JSON invalide');
    }
    const data = racine.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new PapiError('reponse_invalide', 'Reponse de creation Papi sans objet `data`');
    }
    const charge = data as Record<string, unknown>;

    const texte = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const lien = texte(charge.paymentLink);
    const referencePapi = texte(charge.paymentReference);

    if (!lien) {
      throw new PapiError('reponse_invalide', 'Reponse de creation Papi sans `data.paymentLink`');
    }
    if (!referencePapi) {
      throw new PapiError('reponse_invalide', 'Reponse de creation Papi sans `data.paymentReference`');
    }
    if (!this.urlValide(lien, false)) {
      throw new PapiError('reponse_invalide', 'Lien de paiement Papi invalide ou non https');
    }

    // Garde-fou : le montant confirme par Papi doit etre celui demande.
    if (charge.amount !== undefined && charge.amount !== null) {
      const recu = Number(charge.amount);
      if (!Number.isFinite(recu) || Math.round(recu * 100) !== Math.round(params.montantAr * 100)) {
        throw new PapiError(
          'reponse_invalide',
          'Le montant renvoye par Papi ne correspond pas au montant demande',
        );
      }
    }

    this.logger.log(
      `Lien Papi cree : ref=${params.reference}, paymentReference=${referencePapi}`,
    );
    return {
      lienPaiement: new URL(lien).toString(),
      referencePapi,
      devise: texte(charge.currency),
    };
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
      ['failed', 'cancelled', 'canceled', 'expired', 'rejected', 'declined', 'error'].includes(valeur)
    ) {
      return 'failed';
    }
    return 'pending';
  }

  /**
   * Relit le statut reel d'un paiement aupres de Papi (source de verite).
   * Exige PAPI_STATUS_PATH ; sinon echec ferme (aucune confirmation).
   * Le chemin peut contenir {paymentReference} (reference Papi) et/ou
   * {reference} (reference marchande Kianja).
   */
  async verifierStatut(ids: {
    paymentReference?: string | null;
    reference: string;
  }): Promise<StatutFournisseur> {
    this.assertConfigure();
    if (!this.cheminStatut) {
      throw new PapiError(
        'configuration',
        'PAPI_STATUS_PATH non configure : verification du statut impossible',
      );
    }

    const chemin = this.cheminStatut
      .replace('{paymentReference}', encodeURIComponent(ids.paymentReference ?? ''))
      .replace('{reference}', encodeURIComponent(ids.reference));

    const reponse = await this.appeler(
      `${this.baseUrl}${chemin}`,
      { method: 'GET', headers: this.entetes() },
      'verification du statut',
    );

    if (!reponse.ok) {
      this.logger.error(
        `Papi statut KO : HTTP ${reponse.statut}, ref=${ids.reference}, corps=${reponse.texte.slice(0, 300)}`,
      );
      throw this.erreurHttp('verification du statut', reponse.statut);
    }

    const racine = this.lireObjet(reponse.texte);
    if (!racine) {
      throw new PapiError('reponse_invalide', 'Reponse de statut Papi : JSON invalide');
    }
    const data =
      racine.data && typeof racine.data === 'object' && !Array.isArray(racine.data)
        ? (racine.data as Record<string, unknown>)
        : racine;
    return this.normaliserStatut(data.status);
  }
}

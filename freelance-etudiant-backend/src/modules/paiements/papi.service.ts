import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/** Statut normalise d'un paiement, commun a tous les fournisseurs. */
export type StatutFournisseur = 'completed' | 'pending' | 'failed';

/**
 * Etat detaille d'un lien Papi, derive de (linkStatus, paymentStatus) selon
 * le tableau « How to read the two statuses together » de docs.papi.mg :
 *  - cree              : ACTIVE + null    (personne n'a encore paye) ;
 *  - en_cours          : ACTIVE + PENDING (tentative en cours chez l'operateur) ;
 *  - tentative_echouee : ACTIVE + FAILED  (le client peut reessayer sur le meme lien) ;
 *  - reussi            : PAID + SUCCESS   (seul cas de confirmation) ;
 *  - expire            : EXPIRED ;
 *  - desactive         : DISABLED (lien coupe depuis le tableau de bord Papi) ;
 *  - inconnu           : toute autre combinaison (jamais confirme).
 */
export type EtatLienPapi =
  | 'cree'
  | 'en_cours'
  | 'tentative_echouee'
  | 'reussi'
  | 'expire'
  | 'desactive'
  | 'inconnu';

/** Fournisseurs acceptes par le champ `provider` de la creation de lien. */
export const FOURNISSEURS_PAPI = ['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BRED'] as const;
export type FournisseurPapi = (typeof FOURNISSEURS_PAPI)[number];

/**
 * Nature d'un echec Papi, pour distinguer en interne (logs, decisions) :
 * - configuration    : variable manquante/invalide, aucun appel emis ;
 * - parametres       : parametres de paiement invalides, aucun appel emis ;
 * - authentification : cle API refusee par Papi (401, ou 400 « API key invalide ») ;
 * - conflit          : 409 PAYMENT_LINK_CONFLICT (lien actif, autre montant) ;
 * - introuvable      : 404 a la relecture (aucun lien pour cette reference) ;
 * - http             : Papi a repondu par un autre code d'erreur ;
 * - reseau           : timeout / erreur reseau (resultat externe INCERTAIN) ;
 * - reponse_invalide : HTTP 2xx mais corps inexploitable (le lien a peut-etre
 *                      ete cree : resultat externe INCERTAIN).
 */
export type NatureErreurPapi =
  | 'configuration'
  | 'parametres'
  | 'authentification'
  | 'conflit'
  | 'introuvable'
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
    readonly options: {
      statutHttp?: number;
      refusDefinitif?: boolean;
      /** `error.code` du corps d'erreur Papi (ex. CORE_INPUT_400). */
      codePapi?: string;
      delaiDepasse?: boolean;
    } = {},
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

  get codePapi(): string | undefined {
    return this.options.codePapi;
  }

  get delaiDepasse(): boolean {
    return this.options.delaiDepasse === true;
  }

  /**
   * Vrai quand le defaut est tres probablement du cote de la configuration
   * Kianja (cle refusee, URL ou chemin incorrect), pas dans les donnees du
   * client. Le client ne doit alors PAS lire « Papi a refuse la transaction ».
   */
  get configurationProbable(): boolean {
    return (
      this.nature === 'configuration' ||
      this.nature === 'authentification' ||
      [401, 403, 404, 405].includes(this.options.statutHttp ?? 0)
    );
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
  /** Restreint le lien a un operateur ; absent = choix sur la page Papi. */
  fournisseur?: FournisseurPapi;
  emailPayeur?: string;
}

export interface ResultatCreation {
  /** `data.paymentLink` : lien de paiement a ouvrir par le client. */
  lienPaiement: string;
  /**
   * `data.notificationToken` : jeton propre au lien, repris dans chaque
   * notification (controle d'authenticite supplementaire).
   */
  notificationToken?: string;
  devise: string;
  /** `data.linkExpirationDateTime` (epoch ms), si fourni. */
  expiration?: Date;
}

/** Relecture d'un lien (GET /payment-links/{merchantPaymentReference}). */
export interface EtatPaiementPapi {
  statut: StatutFournisseur;
  etat: EtatLienPapi;
  linkStatus: string | null;
  paymentStatus: string | null;
  montant: number | null;
  devise: string | null;
  referenceMarchande: string | null;
  /** UUID Papi de la tentative (null tant que personne n'a paye). */
  referencePapi: string | null;
  /** Operateur effectivement utilise (MVOLA, ORANGE_MONEY, AIRTEL_MONEY, BRED). */
  methode: string | null;
  notificationToken: string | null;
  /** Motif d'echec de la tentative, en francais, quand il y en a un. */
  message: string | null;
}

/** Resultat de la sonde d'authentification (aucune ecriture chez Papi). */
export interface ResultatSonde {
  joignable: boolean;
  authentifie: boolean | null;
  statutHttp?: number;
  codePapi?: string;
  detail: string;
  dureeMs: number;
}

/** Seule devise reglee par Papi aujourd'hui (docs.papi.mg). */
export const DEVISE_PAPI = 'MGA';

const LONGUEUR_MAX_NOM = 255;
/** Limite documentee : description <= 255 caracteres. */
const LONGUEUR_MAX_DESCRIPTION = 255;
const LONGUEUR_MAX_REFERENCE = 100;
/** Montant minimum documente par Papi (creation d'un lien : amount >= 300). */
const MONTANT_MIN_AR = 300;
const DELAI_PAR_DEFAUT_MS = 15_000;
/** validDuration : entier 1..596 heures (defaut Papi : 1 h, trop court pour nous). */
const VALIDITE_PAR_DEFAUT_H = 24;
const VALIDITE_MAX_H = 596;

/** Contrat Papi officiel (docs.papi.mg, Payment link API). */
const BASE_URL_PAR_DEFAUT = 'https://app.papi.mg/engine/api';
const CHEMIN_CREATION_PAR_DEFAUT = '/payment-links';
/** Relecture : GET /payment-links/{merchantPaymentReference}. */
const CHEMIN_STATUT_PAR_DEFAUT = '/payment-links/{reference}';
const ENTETE_AUTH_PAR_DEFAUT = 'Token';
const PREFIXE_GLOBAL_API = '/api/v1';

/**
 * Client de la passerelle de paiement Papi (https://papi.mg), mode
 * « Hosted Checkout » (lien de paiement) : seul mode qui couvre MVola,
 * Orange Money, Airtel Money ET la carte bancaire (BRED).
 *
 * Contrat (docs.papi.mg/docs/api/payment-link) :
 *   POST {base}/payment-links, en-tete `Token: <cle API>` (sans prefixe)
 *     corps   { amount, reference, clientName, description, successUrl,
 *               failureUrl, notificationUrl, validDuration, currency,
 *               provider?, payerEmail? }
 *     reponse { data: { paymentLink, paymentReference (= NOTRE reference),
 *               notificationToken, amount, currency, linkExpirationDateTime } }
 *     erreurs { error: { code, message } } ; ATTENTION : une cle absente ou
 *             inconnue repond 400 CORE_INPUT_400 « API key invalide » (pas 401).
 *   GET {base}/payment-links/{merchantPaymentReference}
 *     reponse { data: { linkStatus, paymentStatus, amount, currency,
 *               merchantPaymentReference, papiPaymentReference,
 *               paymentMethod, notificationToken, message } }
 *     erreurs 401 CORE_PERM_0001 (cle), 404 CORE_404 (reference inconnue).
 */
@Injectable()
export class PapiService implements OnModuleInit {
  private readonly logger = new Logger(PapiService.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly cheminCreation: string;
  private readonly cheminStatut: string;
  private readonly enteteAuth: string;
  private readonly schemeAuth: string;
  private readonly delaiMs: number;
  private readonly validiteH: number;
  private readonly devise: string;
  private readonly production: boolean;

  constructor(private readonly configService: ConfigService) {
    const lire = (cle: string) => this.configService.get<string>(cle)?.trim();

    this.baseUrl = (lire('PAPI_BASE_URL') || BASE_URL_PAR_DEFAUT).replace(/\/+$/, '');
    this.apiKey = lire('PAPI_API_KEY') || '';
    this.cheminCreation = lire('PAPI_CREATE_PATH') || CHEMIN_CREATION_PAR_DEFAUT;
    this.cheminStatut = lire('PAPI_STATUS_PATH') || CHEMIN_STATUT_PAR_DEFAUT;
    this.enteteAuth = lire('PAPI_AUTH_HEADER') || ENTETE_AUTH_PAR_DEFAUT;
    // Defaut : cle seule, sans « Bearer » (en-tete `Token`).
    this.schemeAuth = lire('PAPI_AUTH_SCHEME') ?? '';
    const delai = Number(lire('PAPI_TIMEOUT_MS'));
    this.delaiMs = Number.isFinite(delai) && delai > 0 ? delai : DELAI_PAR_DEFAUT_MS;
    const validite = Number(lire('PAPI_LINK_VALIDITY_HOURS'));
    this.validiteH =
      Number.isInteger(validite) && validite > 0
        ? Math.min(validite, VALIDITE_MAX_H)
        : VALIDITE_PAR_DEFAUT_H;
    this.devise = (lire('PAPI_CURRENCY') || DEVISE_PAPI).toUpperCase();
    this.production = lire('NODE_ENV') === 'production';
  }

  /** Journalise au demarrage l'etat de la configuration (jamais de secret). */
  onModuleInit(): void {
    const { problemes, avertissements } = this.diagnostic();
    if (problemes.length > 0) {
      this.logger.warn(
        `Configuration Papi incomplete : ${problemes.join(' ; ')}. Le paiement Papi restera indisponible ; les autres moyens de paiement ne sont pas affectes.`,
      );
    } else {
      this.logger.log(
        `Papi configure (base=${this.baseUrl}, creation=${this.cheminCreation}, statut=${this.cheminStatut}, en-tete=${this.enteteAuth}${this.schemeAuth ? ` (prefixe ${this.schemeAuth})` : ' (sans prefixe)'}, notification=${this.urlNotification() ?? 'aucune'}, validite=${this.validiteH} h)`,
      );
    }
    for (const avertissement of avertissements) {
      this.logger.warn(`Papi : ${avertissement}`);
    }
  }

  /**
   * URL publique de l'API (prefixe global inclus). API_PUBLIC_URL si
   * definie ; sinon deduite de FRONTEND_URL : la passerelle nginx sert le
   * frontend et l'API sur la MEME origine (/api/ -> backend).
   */
  urlPubliqueApi(): string | undefined {
    const explicite = this.configService.get<string>('API_PUBLIC_URL')?.trim();
    if (explicite) return explicite.replace(/\/+$/, '');
    const frontend = this.configService.get<string>('FRONTEND_URL')?.trim();
    if (!frontend) return undefined;
    return `${frontend.replace(/\/+$/, '')}${PREFIXE_GLOBAL_API}`;
  }

  /** URL de notification envoyee a Papi (webhook signe). */
  urlNotification(): string | undefined {
    const api = this.urlPubliqueApi();
    return api ? `${api}/paiements/webhook/papi` : undefined;
  }

  /**
   * Controle de configuration SANS secret.
   * - problemes      : bloquants (aucun appel n'est emis) ;
   * - avertissements : non bloquants mais a corriger.
   * En production, les URL de retour et de notification doivent etre en
   * https et ne pas pointer vers localhost.
   */
  diagnostic(): { ok: boolean; problemes: string[]; avertissements: string[] } {
    const problemes: string[] = [];
    const avertissements: string[] = [];

    if (!this.apiKey) problemes.push('PAPI_API_KEY absente');

    if (!this.urlValide(this.baseUrl, false)) {
      problemes.push('PAPI_BASE_URL invalide (https requis)');
    }

    if (this.devise !== DEVISE_PAPI) {
      problemes.push(`PAPI_CURRENCY=${this.devise} : Papi ne regle que ${DEVISE_PAPI}`);
    }

    const frontend = this.configService.get<string>('FRONTEND_URL')?.trim();
    const api = this.urlPubliqueApi();
    if (this.production) {
      if (!frontend || !this.urlPubliqueHttps(frontend)) {
        problemes.push(
          `FRONTEND_URL doit etre une URL https publique en production (valeur actuelle : ${frontend ? `${frontend.split(':')[0]}://…` : 'absente'})`,
        );
      }
      if (!api || !this.urlPubliqueHttps(api)) {
        problemes.push(
          'URL de notification non https : definir API_PUBLIC_URL=https://<domaine>/api/v1 (ou FRONTEND_URL en https)',
        );
      }
    }
    if (api && !/\/api\//.test(`${api}/`)) {
      avertissements.push(
        `API_PUBLIC_URL (${api}) ne contient pas le prefixe /api/v1 : la notification Papi n'atteindrait pas le backend (nginx n'achemine que /api/).`,
      );
    }

    if (!this.configService.get<string>('PAPI_WEBHOOK_SECRET')?.trim()) {
      avertissements.push(
        'PAPI_WEBHOOK_SECRET absent : les notifications Papi seront refusees (503) ; les paiements ne seront confirmes que par relecture (retour client ou reconciliation).',
      );
    } else if (
      !/^pwhsec_[0-9a-f]{64}$/.test(this.configService.get<string>('PAPI_WEBHOOK_SECRET')!.trim())
    ) {
      avertissements.push(
        'PAPI_WEBHOOK_SECRET ne respecte pas le format documente (pwhsec_ + 64 hex) : copier le secret EN ENTIER, prefixe inclus.',
      );
    }

    if (
      this.cheminCreation !== CHEMIN_CREATION_PAR_DEFAUT ||
      this.enteteAuth !== ENTETE_AUTH_PAR_DEFAUT ||
      this.schemeAuth
    ) {
      avertissements.push(
        `Contrat personnalise (creation=${this.cheminCreation}, en-tete=${this.enteteAuth}, prefixe=${this.schemeAuth || '(aucun)'}) ; contrat officiel : POST ${CHEMIN_CREATION_PAR_DEFAUT}, en-tete ${ENTETE_AUTH_PAR_DEFAUT} sans prefixe.`,
      );
    }
    if (/\{(?!paymentReference\}|reference\})[^}]*\}/.test(this.cheminStatut)) {
      problemes.push(
        `PAPI_STATUS_PATH (${this.cheminStatut}) contient un parametre non pris en charge`,
      );
    }

    return { ok: problemes.length === 0, problemes, avertissements };
  }

  /** Papi est utilisable si la configuration minimale est valide. */
  get estConfigure(): boolean {
    return this.diagnostic().ok;
  }

  /** Vrai si la verification de statut est possible. */
  get verificationDisponible(): boolean {
    return this.estConfigure;
  }

  /** Informations publiques de configuration (aucun secret). */
  resumeConfiguration(): Record<string, unknown> {
    return {
      baseUrl: this.baseUrl,
      cheminCreation: this.cheminCreation,
      cheminStatut: this.cheminStatut,
      enteteAuth: this.enteteAuth,
      cleApiPresente: Boolean(this.apiKey),
      secretWebhookPresent: Boolean(
        this.configService.get<string>('PAPI_WEBHOOK_SECRET')?.trim(),
      ),
      urlNotification: this.urlNotification() ?? null,
      validiteLienHeures: this.validiteH,
      devise: this.devise,
      delaiMs: this.delaiMs,
    };
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

  private entetes(avecCorps: boolean): Record<string, string> {
    const valeur = this.schemeAuth ? `${this.schemeAuth} ${this.apiKey}` : this.apiKey;
    return {
      [this.enteteAuth]: valeur,
      Accept: 'application/json',
      ...(avecCorps ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  /**
   * fetch avec delai maximal ; toute erreur reseau devient PapiError('reseau')
   * avec la cause technique (DNS, TLS, connexion refusee...) pour le diagnostic.
   */
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
          : `Erreur reseau pendant : ${etape} (${causeReseau(error)})`,
        { delaiDepasse },
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

  /** Corps d'erreur documente : { error: { code, message } }. */
  private lireErreur(texte: string): { code?: string; message?: string } {
    const racine = this.lireObjet(texte);
    const erreur = racine?.error;
    if (!erreur || typeof erreur !== 'object' || Array.isArray(erreur)) return {};
    const e = erreur as Record<string, unknown>;
    return {
      code: typeof e.code === 'string' ? e.code.slice(0, 60) : undefined,
      message: typeof e.message === 'string' ? e.message.slice(0, 300) : undefined,
    };
  }

  private erreurHttp(etape: string, statut: number, texte: string): PapiError {
    const { code, message } = this.lireErreur(texte);
    const suffixe = `${code ? ` [${code}]` : ''}${message ? ` « ${message} »` : ''}`;
    // 4xx = demande refusee (rien cree), sauf 408/429 : on ne sait pas.
    const refusDefinitif = statut >= 400 && statut < 500 && statut !== 408 && statut !== 429;
    const opts = { statutHttp: statut, refusDefinitif, codePapi: code };

    // Papi repond 400 (et non 401) a une cle absente/inconnue sur la creation.
    const cleRefusee =
      statut === 401 ||
      code === 'CORE_PERM_0001' ||
      (statut === 400 && /api\s*key/i.test(message ?? ''));
    if (cleRefusee) {
      return new PapiError(
        'authentification',
        `Papi a refuse la cle API (HTTP ${statut}) pendant : ${etape}${suffixe} : verifier PAPI_API_KEY (cle de la boutique, onglet Developpeur) et l'en-tete ${this.enteteAuth}`,
        opts,
      );
    }
    if (statut === 409) {
      return new PapiError(
        'conflit',
        `Conflit Papi (HTTP 409) pendant : ${etape}${suffixe}`,
        opts,
      );
    }
    if (statut === 404 && etape === 'verification du statut') {
      return new PapiError(
        'introuvable',
        `Aucun lien Papi pour cette reference (HTTP 404)${suffixe}`,
        opts,
      );
    }
    let indice = '';
    if (statut === 404 || statut === 405) {
      indice = ` (URL ou chemin introuvable : verifier PAPI_BASE_URL=${this.baseUrl} ; contrat officiel : POST ${CHEMIN_CREATION_PAR_DEFAUT})`;
    }
    return new PapiError(
      'http',
      `Papi a repondu HTTP ${statut} pendant : ${etape}${suffixe}${indice}`,
      opts,
    );
  }

  /** Valide les parametres AVANT tout appel reseau. */
  private validerParams(params: ParamsCreation): void {
    if (!Number.isFinite(params.montantAr) || params.montantAr <= 0) {
      throw new PapiError('parametres', 'Montant invalide (nombre strictement positif requis)');
    }
    if (params.montantAr < MONTANT_MIN_AR) {
      throw new PapiError(
        'parametres',
        `Montant inferieur au minimum accepte par Papi (${MONTANT_MIN_AR} Ar)`,
      );
    }
    if (
      !params.reference?.trim() ||
      params.reference.length > LONGUEUR_MAX_REFERENCE ||
      // Doc : seuls lettres, chiffres, -, _ et . sont relisibles sans risque.
      !/^[A-Za-z0-9._-]+$/.test(params.reference)
    ) {
      throw new PapiError('parametres', 'Reference marchande manquante, trop longue ou invalide');
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
    if (params.fournisseur && !FOURNISSEURS_PAPI.includes(params.fournisseur)) {
      throw new PapiError('parametres', 'Fournisseur Papi invalide');
    }
  }

  /**
   * Cree un lien de paiement. La creation est idempotente cote Papi sur la
   * reference marchande tant que le lien est actif : rejouer la meme
   * reference (meme montant) renvoie le meme lien. Aucune nouvelle tentative
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
      currency: this.devise,
      validDuration: this.validiteH,
      ...(params.urlNotification ? { notificationUrl: params.urlNotification } : {}),
      ...(params.fournisseur ? { provider: params.fournisseur } : {}),
      ...(params.emailPayeur?.trim() ? { payerEmail: params.emailPayeur.trim() } : {}),
    };

    const debut = Date.now();
    const reponse = await this.appeler(
      `${this.baseUrl}${this.cheminCreation}`,
      { method: 'POST', headers: this.entetes(true), body: JSON.stringify(corps) },
      'creation du lien de paiement',
    );

    if (!reponse.ok) {
      const erreur = this.erreurHttp('creation du lien de paiement', reponse.statut, reponse.texte);
      // Le corps d'erreur Papi ne contient pas de secret ; il n'est jamais renvoye au client.
      this.logger.error(
        `Papi creation KO : ref=${params.reference}, ${Date.now() - debut} ms, nature=${erreur.nature} : ${erreur.message}`,
      );
      throw erreur;
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

    const lien = texte(charge.paymentLink);
    if (!lien) {
      throw new PapiError('reponse_invalide', 'Reponse de creation Papi sans `data.paymentLink`');
    }
    if (!this.urlValide(lien, false)) {
      throw new PapiError('reponse_invalide', 'Lien de paiement Papi invalide ou non https');
    }

    // Dans CETTE reponse, `paymentReference` est l'echo de NOTRE reference.
    const echo = texte(charge.paymentReference);
    if (echo && echo !== params.reference) {
      throw new PapiError(
        'reponse_invalide',
        'La reference renvoyee par Papi ne correspond pas a la reference demandee',
      );
    }

    // Garde-fous : montant et devise confirmes par Papi.
    if (charge.amount !== undefined && charge.amount !== null) {
      if (!memeMontant(charge.amount, params.montantAr)) {
        throw new PapiError(
          'reponse_invalide',
          'Le montant renvoye par Papi ne correspond pas au montant demande',
        );
      }
    }
    const devise = texte(charge.currency)?.toUpperCase() ?? this.devise;
    if (devise !== this.devise) {
      throw new PapiError(
        'reponse_invalide',
        `Devise renvoyee par Papi inattendue (${devise})`,
      );
    }

    const expirationMs = Number(charge.linkExpirationDateTime);
    this.logger.log(
      `Lien Papi obtenu : ref=${params.reference}, ${Date.now() - debut} ms${params.fournisseur ? `, fournisseur=${params.fournisseur}` : ''}`,
    );
    return {
      lienPaiement: new URL(lien).toString(),
      notificationToken: texte(charge.notificationToken)?.slice(0, 100),
      devise,
      expiration:
        Number.isFinite(expirationMs) && expirationMs > 0 ? new Date(expirationMs) : undefined,
    };
  }

  /** (linkStatus, paymentStatus) -> etat detaille. */
  interpreterEtat(linkStatus: unknown, paymentStatus: unknown): EtatLienPapi {
    const lien = norm(linkStatus);
    const paiement = norm(paymentStatus);
    if (lien === 'PAID') return paiement === 'SUCCESS' ? 'reussi' : 'inconnu';
    if (lien === 'EXPIRED') return 'expire';
    if (lien === 'DISABLED') return 'desactive';
    if (lien === 'ACTIVE') {
      if (paiement === '') return 'cree';
      if (paiement === 'PENDING') return 'en_cours';
      if (paiement === 'FAILED') return 'tentative_echouee';
    }
    return 'inconnu';
  }

  /**
   * (linkStatus, paymentStatus) Papi -> statut normalise.
   *  - PAID + SUCCESS            -> completed (seul cas de confirmation) ;
   *  - EXPIRED / DISABLED        -> failed (aucun paiement ne peut plus aboutir) ;
   *  - tout le reste (ACTIVE avec PENDING / FAILED / null, valeur inconnue,
   *    PAID sans SUCCESS) -> pending : ACTIVE+FAILED laisse le client
   *    reessayer sur le meme lien, donc on n'annule jamais a ce stade.
   */
  interpreterStatut(linkStatus: unknown, paymentStatus: unknown): StatutFournisseur {
    const etat = this.interpreterEtat(linkStatus, paymentStatus);
    if (etat === 'reussi') return 'completed';
    if (etat === 'expire' || etat === 'desactive') return 'failed';
    return 'pending';
  }

  /**
   * Relit l'etat reel d'un lien aupres de Papi (source de verite), avec
   * les champs necessaires aux controles de coherence (montant, devise,
   * reference, jeton). Le chemin peut contenir {reference} (reference
   * marchande Kianja, contrat officiel) et/ou {paymentReference}.
   */
  async lireStatut(ids: {
    paymentReference?: string | null;
    reference: string;
  }): Promise<EtatPaiementPapi> {
    this.assertConfigure();

    const chemin = this.cheminStatut
      .replace('{paymentReference}', encodeURIComponent(ids.paymentReference ?? ''))
      .replace('{reference}', encodeURIComponent(ids.reference));

    const restant = chemin.match(/\{[^}]*\}/);
    if (restant) {
      throw new PapiError(
        'configuration',
        `PAPI_STATUS_PATH contient un parametre non pris en charge : ${restant[0]} (seuls {paymentReference} et {reference} sont remplaces)`,
      );
    }

    const reponse = await this.appeler(
      `${this.baseUrl}${chemin}`,
      { method: 'GET', headers: this.entetes(false) },
      'verification du statut',
    );

    if (!reponse.ok) {
      const erreur = this.erreurHttp('verification du statut', reponse.statut, reponse.texte);
      this.logger.error(`Papi statut KO : ref=${ids.reference}, nature=${erreur.nature} : ${erreur.message}`);
      throw erreur;
    }

    const racine = this.lireObjet(reponse.texte);
    if (!racine) {
      throw new PapiError('reponse_invalide', 'Reponse de statut Papi : JSON invalide');
    }
    const data =
      racine.data && typeof racine.data === 'object' && !Array.isArray(racine.data)
        ? (racine.data as Record<string, unknown>)
        : racine;

    const montant = Number(data.amount);
    return {
      statut: this.interpreterStatut(data.linkStatus, data.paymentStatus),
      etat: this.interpreterEtat(data.linkStatus, data.paymentStatus),
      linkStatus: texte(data.linkStatus) ?? null,
      paymentStatus: texte(data.paymentStatus) ?? null,
      montant:
        data.amount !== undefined && data.amount !== null && Number.isFinite(montant)
          ? montant
          : null,
      devise: texte(data.currency)?.toUpperCase() ?? null,
      referenceMarchande: texte(data.merchantPaymentReference) ?? null,
      referencePapi: texte(data.papiPaymentReference)?.slice(0, 100) ?? null,
      methode: texte(data.paymentMethod)?.slice(0, 30) ?? null,
      notificationToken: texte(data.notificationToken)?.slice(0, 100) ?? null,
      message: texte(data.message)?.slice(0, 300) ?? null,
    };
  }

  /** Statut normalise seul (compatibilite). */
  async verifierStatut(ids: {
    paymentReference?: string | null;
    reference: string;
  }): Promise<StatutFournisseur> {
    return (await this.lireStatut(ids)).statut;
  }

  /**
   * Sonde d'authentification SANS effet : relit une reference aleatoire
   * qui n'existe pas. 404 = Papi joignable ET cle acceptee ; 401 = cle
   * refusee. Aucun lien n'est cree, aucun argent n'est engage.
   */
  async sonderAuthentification(): Promise<ResultatSonde> {
    const debut = Date.now();
    const reference = `KIANJA-SONDE-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    try {
      const etat = await this.lireStatut({ reference });
      return {
        joignable: true,
        authentifie: true,
        statutHttp: 200,
        detail: `Reponse inattendue (lien ${etat.etat}) pour une reference aleatoire`,
        dureeMs: Date.now() - debut,
      };
    } catch (error) {
      const papi = error instanceof PapiError ? error : null;
      const dureeMs = Date.now() - debut;
      if (papi?.nature === 'introuvable') {
        return {
          joignable: true,
          authentifie: true,
          statutHttp: 404,
          codePapi: papi.codePapi,
          detail: 'Papi joignable, cle API acceptee (404 attendu pour une reference inexistante)',
          dureeMs,
        };
      }
      if (papi?.nature === 'authentification') {
        return {
          joignable: true,
          authentifie: false,
          statutHttp: papi.statutHttp,
          codePapi: papi.codePapi,
          detail: 'Papi joignable mais cle API refusee',
          dureeMs,
        };
      }
      return {
        joignable: papi?.nature === 'http' || papi?.nature === 'reponse_invalide',
        authentifie: null,
        statutHttp: papi?.statutHttp,
        codePapi: papi?.codePapi,
        detail: error instanceof Error ? error.message : String(error),
        dureeMs,
      };
    }
  }
}

function texte(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function norm(v: unknown): string {
  return typeof v === 'string' ? v.trim().toUpperCase() : '';
}

/** Comparaison exacte au centime (Papi renvoie 15000.0 pour 15000). */
export function memeMontant(recu: unknown, attendu: number | string): boolean {
  const a = Number(recu);
  const b = Number(attendu);
  return Number.isFinite(a) && Number.isFinite(b) && Math.round(a * 100) === Math.round(b * 100);
}

/**
 * Cause technique d'une erreur reseau de fetch (undici) : code systeme
 * (ENOTFOUND = DNS, ECONNREFUSED, ECONNRESET, CERT_* / UNABLE_TO_VERIFY_* = TLS).
 */
function causeReseau(error: unknown): string {
  const cause = (error as { cause?: { code?: unknown; message?: unknown } })?.cause;
  const code = typeof cause?.code === 'string' ? cause.code : undefined;
  const message = typeof cause?.message === 'string' ? cause.message : undefined;
  if (code) {
    const famille = /ENOTFOUND|EAI_AGAIN/.test(code)
      ? 'DNS'
      : /CERT|SSL|TLS|UNABLE_TO_VERIFY/.test(code)
        ? 'TLS'
        : /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|UND_ERR/.test(code)
          ? 'connexion'
          : 'reseau';
    return `${famille} ${code}`;
  }
  return message?.slice(0, 120) ?? (error instanceof Error ? error.message : 'inconnue');
}

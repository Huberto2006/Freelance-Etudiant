import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { LessThan, MoreThan, Not, QueryFailedError, Repository } from 'typeorm';

import { Transaction } from './entities/transaction.entity';
import { EvenementPaiement } from './entities/evenement-paiement.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { CreerPaiementDto } from './dto/creer-paiement.dto';
import {
  MethodePaiement,
  StatutTransaction,
} from './enums/statut-transaction.enum';
import { StatutLivraison } from '../livraisons/enums/statut-livraison.enum';
import { CandidaturesService } from '../candidatures/candidatures.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../notifications/enums/type-notification.enum';
import { MvolaService } from './mvola.service';
import {
  DEVISE_PAPI,
  memeMontant,
  PapiError,
  PapiService,
  type EtatPaiementPapi,
  type FournisseurPapi,
  type StatutFournisseur,
} from './papi.service';
import { ConfigService } from '@nestjs/config';
import { FacturesService } from '../factures/factures.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { MoyensPaiementService } from '../moyens-paiement/moyens-paiement.service';
import { MoyensPaiementClientService } from '../moyens-paiement-client/moyens-paiement-client.service';
import {
  OPERATEURS_PAR_DEFAUT,
  TypeMoyenPaiement,
} from '../moyens-paiement/enums/type-moyen-paiement.enum';

/** Charge utile normalisee du webhook fournisseur. */
export interface WebhookPaiementPayload {
  transactionReference?: string;
  serverCorrelationId?: string;
  /**
   * Papi (docs.papi.mg) : `merchantPaymentReference` = notre reference,
   * `paymentReference` = UUID Papi, `paymentStatus` = SUCCESS | PENDING |
   * FAILED (jamais cru : le statut est relu aupres de Papi). `reference` est
   * conserve pour compatibilite.
   */
  reference?: string;
  merchantPaymentReference?: string;
  papiPaymentReference?: string;
  paymentReference?: string;
  paymentStatus?: string;
  notificationToken?: string;
  id?: string;
  paymentId?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
}

/**
 * Snapshot des coordonnees copiees dans la transaction au moment de sa
 * creation.
 *
 * L'historique du paiement reste ainsi independant des modifications
 * ulterieures du moyen de paiement de l'etudiant.
 */
export interface SnapshotMoyenPaiement {
  moyenPaiementId: string;
  typeMoyenPaiement: TypeMoyenPaiement;
  operateurPaiement: string | null;
  nomBanquePaiement: string | null;
  numeroPaiement: string;
  nomTitulairePaiement: string;
}

/** Messages client des echecs Papi (traduits via erreurs.catalogue.ts). */
const MSG_PAPI_INDISPONIBLE =
  "Le paiement Papi n'est pas disponible pour le moment. Utilisez un autre moyen de paiement ou reessayez plus tard.";
const MSG_PAPI_REFUS =
  'Papi a refuse la transaction. Verifiez vos informations ou utilisez un autre moyen de paiement.';
const MSG_PAPI_NE_REPOND_PAS =
  "Papi ne repond pas correctement pour le moment. Votre paiement n'a pas ete debite ; reessayez dans un instant.";
const MSG_PAPI_CONFLIT =
  'Un lien de paiement Papi est deja actif pour ce paiement avec un autre montant. Reessayez apres son expiration.';
const MSG_VERIF_INDISPONIBLE =
  'La verification aupres du fournisseur est indisponible pour le moment. Reessayez dans un instant.';

/** Delai minimal entre deux relectures automatiques d'une meme transaction. */
const RECONCILIATION_AGE_MIN_MS = 2 * 60_000;
const RECONCILIATION_LOT = 25;
const RECONCILIATION_FENETRE_JOURS = 30;

@Injectable()
export class PaiementsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaiementsService.name);
  private minuteurReconciliation?: NodeJS.Timeout;
  private reconciliationEnCours = false;

  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,

    @InjectRepository(Livraison)
    private readonly livraisonsRepo: Repository<Livraison>,

    private readonly candidaturesService: CandidaturesService,

    private readonly notificationsService: NotificationsService,

    private readonly mvolaService: MvolaService,

    private readonly papiService: PapiService,

    private readonly configService: ConfigService,

    private readonly emailService: EmailService,

    private readonly usersService: UsersService,

    private readonly moyensPaiementService: MoyensPaiementService,

    private readonly moyensPaiementClientService: MoyensPaiementClientService,

    private readonly facturesService: FacturesService,

    @InjectRepository(EvenementPaiement)
    private readonly evenementsRepo: Repository<EvenementPaiement>,
  ) {}

  /**
   * Reconciliation periodique des paiements Papi en attente : rattrape une
   * notification perdue (Papi n'envoie qu'une fois) ou un client qui n'est
   * jamais revenu de la page de paiement. PAPI_RECONCILIATION_MINUTES
   * (defaut 10, 0 = desactivee).
   */
  onModuleInit(): void {
    const minutes = Number(
      this.configService.get<string>('PAPI_RECONCILIATION_MINUTES') ?? 10,
    );
    if (!Number.isFinite(minutes) || minutes <= 0 || !this.papiService.estConfigure) {
      return;
    }
    this.minuteurReconciliation = setInterval(
      () => void this.reconcilierPapiEnAttente(),
      minutes * 60_000,
    );
    this.minuteurReconciliation.unref?.();
  }

  onModuleDestroy(): void {
    if (this.minuteurReconciliation) clearInterval(this.minuteurReconciliation);
  }

  /**
   * Création d'un paiement pour une candidature ACCEPTÉE (modèle
   * sequestre/escrow) : le client peut payer dès l'acceptation, AVANT
   * meme que l'etudiant ait livre. Les fonds restent au statut CONFIRMEE
   * jusqu'a la validation de la livraison par le client, moment ou ils
   * sont automatiquement LIBERES (voir libererSiConfirmee, appelee aussi
   * bien ici — si la livraison est deja validee au moment de la
   * confirmation — que depuis LivraisonsService.valider() — si le
   * paiement a ete confirme avant la livraison).
   *
   * Deux voies :
   *
   * 1. MVola :
   *    - paiement en ligne réel via le fournisseur ;
   *    - le client fournit son numéro débité ;
   *    - confirmation uniquement via vérification fournisseur ou webhook.
   *
   * 2. Virement :
   *    - déclaration manuelle d'un paiement hors plateforme ;
   *    - le paiement reste en attente jusqu'à vérification administrative.
   *
   * Orange Money, Airtel Money et la carte bancaire passent par Papi
   * (methode `papi`, champ `fournisseurPapi`) : il n'existe pas d'API
   * directe Orange / Airtel integree ici.
   *
   * RG-PAY-011 : quelle que soit la méthode, le moyen de paiement de
   * l'étudiant bénéficiaire est obligatoire — c'est la seule coordonnée
   * qui permettra ensuite de lui reverser les fonds lors de la
   * libération. S'il n'est pas explicitement choisi, son moyen principal
   * est utilisé automatiquement ; s'il n'en a configuré aucun, le
   * paiement est refusé avant toute initiation (MVola) ou déclaration
   * (virement), pour ne jamais confirmer un paiement sans destination
   * connue.
   */
  async creer(
    candidatureId: string,
    clientId: string,
    dto: CreerPaiementDto,
  ): Promise<Transaction> {
    // ============================================================
    // MOYENS DE PAIEMENT EN LIGNE NON DISPONIBLES
    // ============================================================

    if (
      dto.methode === MethodePaiement.ORANGE_MONEY ||
      dto.methode === MethodePaiement.AIRTEL_MONEY
    ) {
      // Choix invalide du client (pas une panne) : 400.
      throw new BadRequestException(
        "Ce moyen de paiement n'est pas encore disponible sur la plateforme. Utilisez MVola ou le virement bancaire.",
      );
    }

    // ============================================================
    // VERIFICATION DE LA CANDIDATURE
    // ============================================================

    const candidature =
      await this.candidaturesService.findOne(candidatureId);

    if (candidature.mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez payer que vos propres missions',
      );
    }

    this.candidaturesService.assertCandidatureAcceptee(candidature);

    // ============================================================
    // MODELE SEQUESTRE (RG-PAY-011) : le paiement est possible des que
    // la candidature est acceptee — la validation de la livraison ne
    // conditionne plus la CREATION du paiement, seulement la LIBERATION
    // des fonds deja confirmes (voir libererSiConfirmee).
    // ============================================================

    // ============================================================
    // UNE SEULE TRANSACTION ACTIVE PAR CANDIDATURE
    // ============================================================

    const existante = await this.repo.findOne({
      where: { candidatureId, statut: Not(StatutTransaction.ANNULEE) },
    });

    // Exception : un paiement Papi encore EN ATTENTE peut etre repris
    // (meme reference, meme lien) au lieu de creer un second paiement.
    const reprisePapi =
      dto.methode === MethodePaiement.PAPI &&
      existante?.provider === 'papi' &&
      existante.statut === StatutTransaction.EN_ATTENTE;

    if (existante && !reprisePapi) {
      throw new BadRequestException(
        'Un paiement existe deja pour cette candidature',
      );
    }

    // ============================================================
    // SOURCE DE VERITE FINANCIERE :
    // LE MONTANT EST LE PRIX CONVENU DE LA CANDIDATURE
    // ============================================================

    const montantConvenu = Number(candidature.prixPropose);

    if (dto.montant !== undefined) {
      const montantDeclare = Number(dto.montant);

      if (
        !Number.isFinite(montantDeclare) ||
        Math.round(montantDeclare * 100) !==
          Math.round(montantConvenu * 100)
      ) {
        throw new BadRequestException(
          `Le montant declare (${dto.montant} Ar) ne correspond pas au prix convenu pour ce projet (${montantConvenu} Ar).`,
        );
      }
    }

    // ============================================================
    // RG-PAY-011 : SNAPSHOT DU MOYEN DE PAIEMENT BENEFICIAIRE —
    // OBLIGATOIRE QUELLE QUE SOIT LA METHODE
    //
    // Sans coordonnees beneficiaire, un paiement peut etre confirme puis
    // "libere" (changement de statut) sans que la plateforme sache ou
    // reverser les fonds a l'etudiant. Avant ce correctif, seule la
    // declaration manuelle (virement) l'exigeait ; un paiement MVola
    // pouvait etre confirme sans qu'aucun moyen de paiement actif
    // n'existe cote etudiant. Desormais :
    //  - si le client choisit explicitement un moyen (dto.moyenPaiementId),
    //    il est verifie (propriete + actif) comme avant ;
    //  - sinon, le moyen PRINCIPAL actif de l'etudiant est utilise par
    //    defaut ;
    //  - si l'etudiant n'a configure AUCUN moyen actif, le paiement est
    //    refuse avant toute initiation MVola ou declaration de virement.
    // ============================================================

    const moyenPaiementId = await this.resoudreMoyenPaiementBeneficiaire(
      dto.moyenPaiementId,
      candidature.etudiant.utilisateurId,
    );

    const snapshot = await this.resoudreSnapshot(
      moyenPaiementId,
      candidature.etudiant.utilisateurId,
    );

    // ============================================================
    // PAIEMENT PAPI (lien de paiement : mobile money / carte)
    // Le client choisit son moyen directement sur la page Papi : aucun
    // numero a saisir ici.
    // ============================================================

    if (dto.methode === MethodePaiement.PAPI) {
      return this.creerPaiementPapi(
        candidature,
        candidatureId,
        clientId,
        montantConvenu,
        snapshot,
        dto.moyenPaiementClientId,
        reprisePapi ? existante : null,
        dto.fournisseurPapi,
      );
    }

    // ============================================================
    // PAIEMENT MVOLA
    // ============================================================

    if (dto.methode === MethodePaiement.MVOLA) {
      // RG-PAY-012 : si le client a choisi un moyen de paiement
      // enregistré (plutôt que de retaper un numéro), on en reprend le
      // numéro — après avoir vérifié qu'il lui appartient bien et qu'il
      // est actif (MoyensPaiementClientService.trouverPourPaiement,
      // même garde que côté bénéficiaire). dto.telephoneDebite reste
      // prioritaire s'il est fourni directement (saisie ponctuelle,
      // sans enregistrement).
      let telephoneDebite = dto.telephoneDebite;
      let moyenPaiementClientId: string | undefined;

      if (!telephoneDebite && dto.moyenPaiementClientId) {
        const moyenClient =
          await this.moyensPaiementClientService.trouverPourPaiement(
            dto.moyenPaiementClientId,
            clientId,
          );
        telephoneDebite = moyenClient.numero;
        moyenPaiementClientId = moyenClient.id;
      } else if (dto.moyenPaiementClientId) {
        // Les deux ont été fournis : on fait confiance au numéro
        // explicite pour le débit MVola, mais on trace quand même le
        // moyen choisi pour l'historique.
        moyenPaiementClientId = dto.moyenPaiementClientId;
      }

      if (!telephoneDebite) {
        throw new BadRequestException(
          'Le numéro MVola du payeur est obligatoire (saisissez-le ou sélectionnez un moyen de paiement enregistré).',
        );
      }

      return this.creerPaiementMvola(
        candidature,
        candidatureId,
        clientId,
        telephoneDebite,
        montantConvenu,
        snapshot,
        moyenPaiementClientId,
      );
    }

    // ============================================================
    // DECLARATION MANUELLE
    // ============================================================

    if (!dto.reference) {
      throw new BadRequestException(
        'La reference du virement est obligatoire.',
      );
    }

    const transaction = this.repo.create({
      candidatureId,
      clientId,
      etudiantId: candidature.etudiant.utilisateurId,
      montant: montantConvenu,
      methode: dto.methode,
      reference: dto.reference.trim(),
      statut: StatutTransaction.EN_ATTENTE,

      // Snapshot du moyen bénéficiaire.
      ...snapshot,

      provider: 'manuel',
    });

    let saved: Transaction;

    try {
      saved = await this.repo.save(transaction);
    } catch (error) {
      // Protection contre deux créations concurrentes.
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Un paiement existe deja pour cette candidature',
        );
      }

      throw error;
    }

    // ============================================================
    // NOTIFICATION ET EMAIL DE L'ETUDIANT
    // ============================================================

    await this.notificationsService.creer({
      destinataireId: candidature.etudiant.utilisateurId,
      type: TypeNotification.PAIEMENT_INITIE,
      titre: 'Paiement déclaré',
      message: `Le client a déclaré un paiement de ${montantConvenu} Ar pour "${candidature.mission.titre}".`,
      lienUrl: '/tableau-de-bord/paiements',
    });

    await this.emailService.envoyerPaiementInitie(
      await this.emailDeUtilisateur(
        candidature.etudiant.utilisateurId,
      ),
      {
        nom:
          candidature.etudiant.utilisateur?.nom ??
          'Etudiant',
        titreMission: candidature.mission.titre,
        montant: montantConvenu,
        reference: saved.reference,
      },
    );

    return saved;
  }

  /**
   * Paiement en ligne via la passerelle Papi (lien de paiement).
   *
   * ORDRE VOLONTAIRE : la transaction (EN_ATTENTE, sans lien) est creee
   * AVANT l'appel a Papi. L'index unique « une transaction active par
   * candidature » devient ainsi un verrou : deux requetes concurrentes ne
   * peuvent pas creer deux liens de paiement.
   *
   * Issue de l'appel Papi :
   *  - succes            : lien, jeton de notification et expiration enregistres ;
   *  - refus definitif   : (HTTP 4xx) transaction ANNULEE, creneau libere ;
   *  - resultat incertain: (timeout, 5xx, reponse mal formee, echec de
   *    sauvegarde) la transaction reste EN_ATTENTE SANS lien et n'est
   *    JAMAIS declaree echouee. Le client peut relancer : la meme
   *    transaction et la meme reference marchande sont reutilisees
   *    (creation idempotente cote Papi), jamais de nouvelle tentative
   *    automatique.
   *
   * Reprise d'une transaction qui a deja un lien : l'etat est d'abord relu
   * chez Papi. Paye -> confirme ; expire/desactive -> annulee puis nouveau
   * paiement (nouvelle reference) ; sinon le meme lien est renvoye.
   */
  private async creerPaiementPapi(
    candidature: Awaited<ReturnType<CandidaturesService['findOne']>>,
    candidatureId: string,
    clientId: string,
    montantConvenu: number,
    snapshot: Partial<SnapshotMoyenPaiement> = {},
    moyenPaiementClientId?: string,
    existante: Transaction | null = null,
    fournisseur?: FournisseurPapi,
  ): Promise<Transaction> {
    const diagnostic = this.papiService.diagnostic();
    if (!diagnostic.ok) {
      this.logger.error(
        `Paiement Papi indisponible (configuration) : ${diagnostic.problemes.join(' ; ')}`,
      );
      throw new ServiceUnavailableException(MSG_PAPI_INDISPONIBLE);
    }

    if (existante?.lienPaiement) {
      const reprise = await this.reprendrePaiementPapi(existante);
      if (reprise) return reprise;
      // Lien mort (expire / desactive) : la transaction vient d'etre annulee,
      // un nouveau paiement est cree ci-dessous avec une nouvelle reference.
      existante = null;
    }

    if (!Number.isFinite(montantConvenu) || montantConvenu <= 0) {
      throw new BadRequestException('Montant du paiement invalide.');
    }

    // Nom du client : relation reelle mission -> client (profil) -> utilisateur.
    const nomClient = candidature.mission.client?.utilisateur?.nom?.trim();
    if (!nomClient) {
      this.logger.error(
        `Paiement Papi : nom du client introuvable (candidature ${candidatureId})`,
      );
      throw new BadRequestException(
        'Le nom du client est introuvable : completez votre profil avant de payer.',
      );
    }

    if (moyenPaiementClientId) {
      // Verifie propriete + actif ; le numero n'est pas utilise (Papi le
      // demande au client sur sa page de paiement).
      await this.moyensPaiementClientService.trouverPourPaiement(
        moyenPaiementClientId,
        clientId,
      );
    }

    // 1) Transaction locale (ou reprise de l'existante sans lien).
    let transaction: Transaction;
    let premiereCreation = false;

    if (existante) {
      transaction = existante;
    } else {
      const reference = `KIANJA-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      try {
        transaction = await this.repo.save(
          this.repo.create({
            candidatureId,
            clientId,
            etudiantId: candidature.etudiant.utilisateurId,
            montant: montantConvenu,
            devise: DEVISE_PAPI,
            methode: MethodePaiement.PAPI,
            reference,
            statut: StatutTransaction.EN_ATTENTE,
            provider: 'papi',
            providerStatut: 'creation_en_cours',
            methodeFournisseur: fournisseur ?? null,
            moyenPaiementClientId: moyenPaiementClientId ?? null,
            ...snapshot,
          }),
        );
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          (error as unknown as { code?: string }).code === '23505'
        ) {
          throw new ConflictException(
            'Un paiement existe deja pour cette candidature',
          );
        }
        throw error;
      }
      premiereCreation = true;
    }

    // 2) Creation du lien chez Papi (un seul essai).
    const frontend = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001'
    ).replace(/\/+$/, '');
    const retour = `${frontend}/tableau-de-bord/paiements?retour=papi&ref=${encodeURIComponent(transaction.reference)}`;

    let creation: Awaited<ReturnType<PapiService['creerPaiement']>>;
    try {
      creation = await this.papiService.creerPaiement({
        montantAr: Number(transaction.montant),
        reference: transaction.reference,
        nomClient,
        description: `Paiement mission "${candidature.mission.titre}" - KIANJA`,
        urlSucces: `${retour}&resultat=succes`,
        urlEchec: `${retour}&resultat=echec`,
        urlNotification: this.papiService.urlNotification(),
        // Une reprise conserve la restriction d'origine (idempotence Papi).
        fournisseur:
          (transaction.methodeFournisseur as FournisseurPapi | null | undefined) ??
          fournisseur,
        emailPayeur: candidature.mission.client?.utilisateur?.email,
      });
    } catch (error) {
      await this.traiterEchecCreationPapi(transaction, error);
      throw this.exceptionCreationPapi(error);
    }

    // 3) Enregistrement du lien (mise a jour ciblee : ne touche jamais au statut).
    const maj: Partial<Transaction> = {
      lienPaiement: creation.lienPaiement,
      notificationToken: creation.notificationToken ?? null,
      dateExpirationLien: creation.expiration ?? null,
      devise: creation.devise,
      providerStatut: 'cree',
    };
    try {
      await this.repo.update(
        { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
        maj,
      );
    } catch (error) {
      // Papi a cree le lien mais la sauvegarde a echoue : etat incertain,
      // a reconcilier. La transaction reste EN_ATTENTE ; un nouvel essai
      // reutilise la meme reference marchande (Papi renvoie le meme lien).
      this.logger.error(
        `INCOHERENCE A RECONCILIER : lien Papi cree mais non enregistre (ref=${transaction.reference}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException(
        'Le paiement a ete initie mais son enregistrement a echoue. Reessayez : votre paiement sera repris sans doublon.',
      );
    }

    Object.assign(transaction, maj);
    // Le jeton n'est jamais renvoye au navigateur.
    delete transaction.notificationToken;

    // Notifications metier : une seule fois, a la premiere obtention du lien.
    if (premiereCreation) {
      await this.notificationsService.creer({
        destinataireId: candidature.etudiant.utilisateurId,
        type: TypeNotification.PAIEMENT_INITIE,
        titre: 'Paiement initié',
        message: `Un paiement de ${montantConvenu} Ar est en cours pour "${candidature.mission.titre}".`,
        lienUrl: '/tableau-de-bord/paiements',
      });

      await this.emailService.envoyerPaiementInitie(
        await this.emailDeUtilisateur(candidature.etudiant.utilisateurId),
        {
          nom: candidature.etudiant.utilisateur?.nom ?? 'Etudiant',
          titreMission: candidature.mission.titre,
          montant: montantConvenu,
          reference: transaction.reference,
        },
      );
    }

    return transaction;
  }

  /**
   * Reprise d'une transaction Papi EN_ATTENTE qui a deja un lien.
   * Renvoie la transaction a montrer au client, ou null si le lien est
   * mort (la transaction a alors ete annulee).
   */
  private async reprendrePaiementPapi(
    existante: Transaction,
  ): Promise<Transaction | null> {
    let etat: EtatPaiementPapi;
    try {
      etat = await this.papiService.lireStatut({
        paymentReference: existante.providerCorrelationId,
        reference: existante.reference,
      });
    } catch (error) {
      // Relecture impossible : le lien deja obtenu reste le meilleur choix
      // (Papi refusera lui-meme un lien expire), jamais de doublon.
      this.logger.warn(
        `Reprise Papi sans relecture (ref=${existante.reference}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return existante;
    }

    const apres = await this.appliquerEtatPapi(existante, etat, 'reprise');
    if (apres.statut === StatutTransaction.ANNULEE) {
      return null;
    }
    return apres;
  }

  /**
   * Erreur de creation Papi -> exception HTTP precise (plus de 503
   * generique) :
   *  - configuration / cle refusee / URL incorrecte -> 503 (panne cote Kianja) ;
   *  - 409 PAYMENT_LINK_CONFLICT -> 409 ;
   *  - autre refus 4xx de Papi -> 502 (passerelle a refuse la requete) ;
   *  - delai depasse -> 504 ;
   *  - erreur reseau, 5xx, reponse invalide -> 502.
   */
  private exceptionCreationPapi(error: unknown): HttpException {
    if (error instanceof HttpException) return error;
    const papi = error instanceof PapiError ? error : null;
    if (!papi || papi.configurationProbable) {
      return new ServiceUnavailableException(MSG_PAPI_INDISPONIBLE);
    }
    if (papi.nature === 'conflit') return new ConflictException(MSG_PAPI_CONFLIT);
    if (papi.nature === 'parametres' || papi.refusDefinitif) {
      return new BadGatewayException(MSG_PAPI_REFUS);
    }
    if (papi.delaiDepasse) return new GatewayTimeoutException(MSG_PAPI_NE_REPOND_PAS);
    return new BadGatewayException(MSG_PAPI_NE_REPOND_PAS);
  }

  /** Erreur de relecture fournisseur -> exception HTTP precise. */
  private exceptionVerification(error: unknown): HttpException {
    const papi = error instanceof PapiError ? error : null;
    if (papi?.delaiDepasse) return new GatewayTimeoutException(MSG_VERIF_INDISPONIBLE);
    if (papi && !papi.configurationProbable && papi.nature !== 'configuration') {
      return new BadGatewayException(MSG_VERIF_INDISPONIBLE);
    }
    return new ServiceUnavailableException(MSG_VERIF_INDISPONIBLE);
  }

  /**
   * Echec de creation du lien Papi : refus definitif -> annulation ;
   * resultat incertain -> la transaction reste en attente (jamais
   * « echouee » par hypothese).
   */
  private async traiterEchecCreationPapi(
    transaction: Transaction,
    error: unknown,
  ): Promise<void> {
    const papi = error instanceof PapiError ? error : null;
    this.logger.error(
      `Echec creation Papi (ref=${transaction.reference}) : nature=${papi?.nature ?? 'inconnue'}, http=${papi?.statutHttp ?? '-'}, code=${papi?.codePapi ?? '-'}, definitif=${papi?.refusDefinitif ?? false} : ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    try {
      // Une cle refusee ou un conflit ne creent rien chez Papi : on libere
      // le creneau pour permettre un nouvel essai une fois corrige.
      if (papi?.refusDefinitif || papi?.nature === 'parametres') {
        await this.repo.update(
          { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
          {
            statut: StatutTransaction.ANNULEE,
            providerStatut:
              papi.nature === 'authentification'
                ? 'cle_papi_refusee'
                : papi.nature === 'conflit'
                  ? 'conflit_papi'
                  : 'refuse_par_papi',
          },
        );
      } else {
        await this.repo.update(
          { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
          { providerStatut: 'creation_incertaine' },
        );
      }
    } catch (majError) {
      this.logger.error(
        `Mise a jour du statut de creation impossible (ref=${transaction.reference}) : ${
          majError instanceof Error ? majError.message : String(majError)
        }`,
      );
    }
  }

  /** Fournisseurs en ligne : leur statut est gere par le fournisseur. */
  private estEnLigne(transaction: Transaction): boolean {
    return transaction.provider === 'mvola' || transaction.provider === 'papi';
  }

  /** Jeton de notification Papi stocke (colonne non selectionnee par defaut). */
  private async jetonNotification(transactionId: string): Promise<string | null> {
    try {
      const ligne = await this.repo.findOne({
        where: { id: transactionId },
        select: { id: true, notificationToken: true },
      });
      return ligne?.notificationToken ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Controle la relecture Papi d'un paiement REUSSI avant confirmation :
   * reference, montant, devise et jeton doivent correspondre a la
   * transaction. Renvoie le motif d'anomalie, ou null si tout concorde.
   */
  private async anomaliePapi(
    transaction: Transaction,
    etat: EtatPaiementPapi,
  ): Promise<string | null> {
    if (etat.referenceMarchande && etat.referenceMarchande !== transaction.reference) {
      return 'anomalie_reference';
    }
    if (etat.montant === null || !memeMontant(etat.montant, transaction.montant)) {
      return 'anomalie_montant';
    }
    const devise = (transaction.devise || DEVISE_PAPI).toUpperCase();
    if (etat.devise && etat.devise !== devise) {
      return 'anomalie_devise';
    }
    const jeton = await this.jetonNotification(transaction.id);
    if (jeton && etat.notificationToken && jeton !== etat.notificationToken) {
      return 'anomalie_jeton';
    }
    return null;
  }

  /**
   * Applique une relecture Papi a une transaction EN_ATTENTE (source de
   * verite unique pour la verification, le webhook, la reprise et la
   * reconciliation). Seul un paiement REUSSI et COHERENT est confirme.
   */
  private async appliquerEtatPapi(
    transaction: Transaction,
    etat: EtatPaiementPapi,
    origine: string,
  ): Promise<Transaction> {
    const champs: Partial<Transaction> = { providerStatut: etat.etat };
    if (etat.referencePapi) champs.providerCorrelationId = etat.referencePapi;
    if (etat.methode) champs.methodeFournisseur = etat.methode;

    if (etat.statut === 'completed') {
      const anomalie = await this.anomaliePapi(transaction, etat);
      if (anomalie) {
        this.logger.error(
          `PAIEMENT PAPI A VERIFIER (${origine}) : ${anomalie} pour ${transaction.reference} (montant Papi=${String(etat.montant)} ${etat.devise ?? '?'}, attendu=${String(transaction.montant)} ${transaction.devise ?? DEVISE_PAPI}, ref Papi=${etat.referenceMarchande ?? '?'}) : NON confirme`,
        );
        champs.providerStatut = anomalie;
        await this.repo.update(
          { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
          champs,
        );
        Object.assign(transaction, champs);
        return transaction;
      }
    }

    // Traces fournisseur d'abord (mise a jour ciblee : jamais d'ecrasement
    // d'un statut deja change par un autre processus).
    await this.repo.update(
      { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
      champs,
    );
    Object.assign(transaction, champs);

    this.logger.log(
      `Relecture Papi (${origine}) : ref=${transaction.reference}, linkStatus=${etat.linkStatus ?? '-'}, paymentStatus=${etat.paymentStatus ?? '-'}, etat=${etat.etat}${etat.methode ? `, methode=${etat.methode}` : ''}${etat.message ? `, motif=${etat.message}` : ''}`,
    );

    if (etat.statut === 'completed') return this.marquerConfirmee(transaction);
    if (etat.statut === 'failed') return this.marquerAnnulee(transaction);
    return transaction;
  }

  /**
   * Relit chez Papi et applique. Un 404 sur une transaction qui n'a JAMAIS
   * obtenu de lien prouve que Papi n'a rien cree : elle est annulee.
   */
  private async verifierPapi(
    transaction: Transaction,
    origine: string,
  ): Promise<Transaction> {
    let etat: EtatPaiementPapi;
    try {
      etat = await this.papiService.lireStatut({
        paymentReference: transaction.providerCorrelationId,
        reference: transaction.reference,
      });
    } catch (error) {
      if (
        error instanceof PapiError &&
        error.nature === 'introuvable' &&
        !transaction.lienPaiement
      ) {
        await this.repo.update(
          { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
          { providerStatut: 'non_cree_chez_papi' },
        );
        transaction.providerStatut = 'non_cree_chez_papi';
        return this.marquerAnnulee(transaction);
      }
      throw error;
    }
    return this.appliquerEtatPapi(transaction, etat, origine);
  }

  /**
   * Relit les paiements Papi EN_ATTENTE non mis a jour depuis quelques
   * minutes (notification perdue, client jamais revenu). Sans chevauchement.
   */
  async reconcilierPapiEnAttente(): Promise<{ verifiees: number; erreurs: number }> {
    if (this.reconciliationEnCours) return { verifiees: 0, erreurs: 0 };
    this.reconciliationEnCours = true;
    let verifiees = 0;
    let erreurs = 0;
    try {
      const maintenant = Date.now();
      const enAttente = await this.repo.find({
        where: {
          provider: 'papi',
          statut: StatutTransaction.EN_ATTENTE,
          dateMiseAJour: LessThan(new Date(maintenant - RECONCILIATION_AGE_MIN_MS)),
          dateCreation: MoreThan(
            new Date(maintenant - RECONCILIATION_FENETRE_JOURS * 86_400_000),
          ),
        },
        relations: ['candidature', 'candidature.mission', 'client', 'etudiant'],
        order: { dateMiseAJour: 'ASC' },
        take: RECONCILIATION_LOT,
      });
      for (const transaction of enAttente) {
        try {
          await this.verifierPapi(transaction, 'reconciliation');
          verifiees++;
        } catch (error) {
          erreurs++;
          this.logger.warn(
            `Reconciliation Papi impossible pour ${transaction.reference} : ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          // Une panne generale de Papi ne doit pas enchainer 25 delais.
          if (error instanceof PapiError && ['reseau', 'configuration', 'authentification'].includes(error.nature)) {
            break;
          }
        }
      }
      if (enAttente.length > 0) {
        this.logger.log(
          `Reconciliation Papi : ${verifiees} relue(s), ${erreurs} erreur(s) sur ${enAttente.length}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Reconciliation Papi interrompue : ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.reconciliationEnCours = false;
    }
    return { verifiees, erreurs };
  }

  /** Diagnostic Papi pour l'administrateur (aucun secret). */
  async diagnosticPapi(sonder: boolean) {
    const configuration = this.papiService.diagnostic();
    return {
      configuration: { ...configuration, ...this.papiService.resumeConfiguration() },
      sonde: sonder && configuration.ok ? await this.papiService.sonderAuthentification() : null,
    };
  }

  /** Interroge MVola (source de verite du statut). */
  private async statutAupresDuFournisseur(
    transaction: Transaction,
  ): Promise<StatutFournisseur> {
    return this.mvolaService.verifierStatut(
      transaction.providerCorrelationId as string,
    );
  }

  /**
   * Paiement MVola réel.
   *
   * L'initiation est effectuée auprès du fournisseur avant
   * l'enregistrement de la transaction.
   */
  private async creerPaiementMvola(
    candidature: Awaited<
      ReturnType<CandidaturesService['findOne']>
    >,
    candidatureId: string,
    clientId: string,
    telephoneDebite: string,
    montantConvenu: number,
    snapshot: Partial<SnapshotMoyenPaiement> = {},
    moyenPaiementClientId?: string,
  ): Promise<Transaction> {
    if (!this.mvolaService.estConfigure) {
      throw new ServiceUnavailableException(
        "Le paiement MVola en ligne n'est pas actif sur la plateforme. Configurez les identifiants marchands (MVOLA_*) ou utilisez le virement.",
      );
    }

    const reference = `KIANJA-${crypto
      .randomBytes(6)
      .toString('hex')
      .toUpperCase()}`;

    const transaction = this.repo.create({
      candidatureId,
      clientId,
      etudiantId: candidature.etudiant.utilisateurId,
      montant: montantConvenu,
      methode: MethodePaiement.MVOLA,
      reference,
      statut: StatutTransaction.EN_ATTENTE,
      provider: 'mvola',
      telephoneDebite,
      providerStatut: 'initiation_en_cours',
      moyenPaiementClientId: moyenPaiementClientId ?? null,

      // Snapshot du moyen bénéficiaire.
      ...snapshot,
    });

    let saved: Transaction;

    try {
      saved = await this.repo.save(transaction);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Un paiement existe deja pour cette candidature',
        );
      }

      throw error;
    }

    let initiation: {
      serverCorrelationId: string;
      statut: string;
    };

    try {
      initiation = await this.mvolaService.initierPaiement({
        montantAr: montantConvenu,
        transactionReference: reference,
        telephoneDebite,
        description: `Paiement mission "${candidature.mission.titre}" - KIANJA`,
      });
    } catch (error) {
      this.logger.error(
        `Echec d'initiation MVola pour la candidature ${candidatureId}, reference ${reference} : ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
      await this.marquerInitiationMvolaIncertaine(saved.id, reference);
      throw new ServiceUnavailableException(
        `Le resultat de la demande MVola est incertain (reference ${reference}). Ne relancez pas le paiement avant verification aupres du fournisseur.`,
      );
    }

    try {
      const resultatMiseAJour = await this.repo.update(
        { id: saved.id, statut: StatutTransaction.EN_ATTENTE },
        {
          providerCorrelationId: initiation.serverCorrelationId,
          providerStatut: initiation.statut,
        },
      );
      if (!resultatMiseAJour.affected) {
        throw new Error('La reservation du paiement MVola a disparu');
      }
    } catch (error) {
      this.logger.error(
        `Initiation MVola effectuee mais non rattachee a la reference ${reference} : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.marquerInitiationMvolaIncertaine(saved.id, reference);
      throw new ServiceUnavailableException(
        `La demande MVola a ete transmise, mais son suivi n'a pas pu etre enregistre (reference ${reference}). Ne relancez pas le paiement avant reconciliation.`,
      );
    }

    saved.providerCorrelationId = initiation.serverCorrelationId;
    saved.providerStatut = initiation.statut;

    await this.notificationsService.creer({
      destinataireId: candidature.etudiant.utilisateurId,
      type: TypeNotification.PAIEMENT_INITIE,
      titre: 'Paiement initié',
      message: `Un paiement MVola de ${montantConvenu} Ar est en attente de confirmation pour "${candidature.mission.titre}".`,
      lienUrl: '/tableau-de-bord/paiements',
    });

    await this.emailService.envoyerPaiementInitie(
      await this.emailDeUtilisateur(
        candidature.etudiant.utilisateurId,
      ),
      {
        nom:
          candidature.etudiant.utilisateur?.nom ??
          'Etudiant',
        titreMission: candidature.mission.titre,
        montant: montantConvenu,
        reference,
      },
    );

    return saved;
  }

  private async marquerInitiationMvolaIncertaine(
    transactionId: string,
    reference: string,
  ): Promise<void> {
    try {
      const resultat = await this.repo.update(
        { id: transactionId, statut: StatutTransaction.EN_ATTENTE },
        { providerStatut: 'initiation_inconnue' },
      );
      if (!resultat.affected) {
        this.logger.error(
          `La reservation MVola ${reference} n'a pas pu etre mise a jour pour tracer le resultat incertain`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Impossible de marquer la reservation MVola ${reference} comme incertaine : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Récupère une transaction par son identifiant.
   */
  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.repo.findOne({
      where: { id },
      relations: [
        'candidature',
        'candidature.mission',
      ],
    });

    if (!transaction) {
      throw new NotFoundException(
        'Paiement introuvable',
      );
    }

    return transaction;
  }

  /**
   * Récupère toutes les transactions.
   */
  async findAll(
    statut?: StatutTransaction,
  ): Promise<Transaction[]> {
    return this.repo.find({
      where: statut ? { statut } : {},
      relations: [
        'candidature',
        'candidature.mission',
        'client',
        'etudiant',
      ],
      order: {
        dateCreation: 'DESC',
      },
    });
  }

  /**
   * Transactions d'un client.
   */
  async findByClient(
    clientId: string,
  ): Promise<Transaction[]> {
    return this.repo
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.candidature', 'candidature')
      .leftJoinAndSelect('candidature.mission', 'mission')
      .leftJoin('transaction.client', 'client')
      .addSelect(['client.id', 'client.nom'])
      .leftJoin('transaction.etudiant', 'etudiant')
      .addSelect(['etudiant.id', 'etudiant.nom'])
      .where('transaction.clientId = :clientId', { clientId })
      .orderBy('transaction.dateCreation', 'DESC')
      .getMany();
  }

  /**
   * Transactions reçues par un étudiant.
   */
  async findByEtudiant(
    etudiantId: string,
  ): Promise<Transaction[]> {
    return this.repo
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.candidature', 'candidature')
      .leftJoinAndSelect('candidature.mission', 'mission')
      .leftJoin('transaction.client', 'client')
      .addSelect(['client.id', 'client.nom'])
      .leftJoin('transaction.etudiant', 'etudiant')
      .addSelect(['etudiant.id', 'etudiant.nom'])
      .where('transaction.etudiantId = :etudiantId', { etudiantId })
      .orderBy('transaction.dateCreation', 'DESC')
      .getMany();
  }

  // ============================================================
  // MOYENS DE PAIEMENT — ACCES SECURISE
  // ============================================================

  /**
   * Résout le moyen de paiement sélectionné et construit son snapshot.
   *
   * Le moyen doit :
   * - appartenir à l'étudiant bénéficiaire ;
   * - être actif ;
   * - exister.
   *
   * Les données sont ensuite copiées dans la transaction.
   */
  /**
   * RG-PAY-011 : garantit qu'un moyen de paiement beneficiaire sera
   * toujours disponible pour la transaction. Retourne l'identifiant a
   * utiliser (celui fourni, ou le moyen principal actif de l'etudiant),
   * et leve une erreur explicite si l'etudiant n'a configure aucun
   * moyen actif — avant toute initiation MVola ou declaration de
   * virement, pour ne jamais laisser le client engager un paiement sans
   * destination possible.
   */
  private async resoudreMoyenPaiementBeneficiaire(
    moyenPaiementIdChoisi: string | undefined | null,
    etudiantId: string,
  ): Promise<string> {
    if (moyenPaiementIdChoisi) {
      return moyenPaiementIdChoisi;
    }

    const moyens =
      await this.moyensPaiementService.listerPourClient(etudiantId);

    const principal = moyens.find((moyen) => moyen.principal) ?? moyens[0];

    if (!principal) {
      throw new BadRequestException(
        "L'étudiant bénéficiaire n'a pas encore configuré de moyen de paiement actif. Le paiement ne peut pas être effectué tant qu'il n'en a pas ajouté un dans ses paramètres.",
      );
    }

    return principal.id;
  }

  private async resoudreSnapshot(
    moyenPaiementId: string | undefined | null,
    etudiantId: string | null | undefined,
  ): Promise<Partial<SnapshotMoyenPaiement>> {
    if (
      !moyenPaiementId ||
      !etudiantId
    ) {
      return {};
    }

    const moyen =
      await this.moyensPaiementService.trouverPourPaiement(
        moyenPaiementId,
        etudiantId,
      );

    return {
      moyenPaiementId: moyen.id,
      typeMoyenPaiement: moyen.type,

      operateurPaiement:
        moyen.operateur ??
        OPERATEURS_PAR_DEFAUT[moyen.type] ??
        null,

      nomBanquePaiement:
        moyen.nomBanque,

      numeroPaiement:
        moyen.numero,

      nomTitulairePaiement:
        moyen.nomTitulaire,
    };
  }

  /**
   * Coordonnées de l'étudiant bénéficiaire lorsque le paiement
   * est réellement dû.
   *
   * Chaîne d'autorisation (modèle séquestre, RG-PAY-011) :
   *
   * client authentifié
   *      ↓
   * candidature
   *      ↓
   * mission appartenant au client
   *      ↓
   * candidature acceptée (le paiement n'attend plus la validation de
   * la livraison : il peut être effectué dès l'acceptation, les fonds
   * restant séquestrés jusqu'à la validation)
   *      ↓
   * moyens de paiement de l'étudiant
   */
  async moyensPourCandidature(
    candidatureId: string,
    demandeurId: string,
    estAdmin = false,
  ): Promise<{
    candidatureId: string;
    missionTitre: string;
    montant: number;
    moyensPaiement: Awaited<
      ReturnType<
        MoyensPaiementService['listerPourClient']
      >
    >;
  }> {
    const candidature =
      await this.candidaturesService.findOne(
        candidatureId,
      );

    // Sécurité : le client doit être propriétaire
    // de la mission.
    if (
      !estAdmin &&
      candidature.mission.clientId !== demandeurId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que les coordonnees de vos propres missions',
      );
    }

    // Les coordonnées ne sont accessibles qu'une fois la candidature
    // acceptée (déjà vérifié par le chargement ci-dessus, qui lève une
    // 404 sinon) — le paiement n'attend plus la validation de la
    // livraison.
    this.candidaturesService.assertCandidatureAcceptee(candidature);

    const moyensPaiement =
      await this.moyensPaiementService.listerPourClient(
        candidature.etudiant.utilisateurId,
      );

    return {
      candidatureId,
      missionTitre:
        candidature.mission.titre,
      montant:
        Number(candidature.prixPropose),
      moyensPaiement,
    };
  }

  /**
   * Coordonnées liées à un paiement existant.
   *
   * IMPORTANT :
   *
   * Pour les nouvelles transactions, cette méthode utilise le snapshot
   * enregistré dans Transaction.
   *
   * Elle ne récupère donc PAS les coordonnées actuelles de l'étudiant.
   *
   * Cela garantit que l'historique reste cohérent même si le numéro,
   * la banque ou le titulaire a changé après le paiement.
   */
  async moyensPourPaiement(
    paiementId: string,
    demandeurId: string,
    estAdmin = false,
  ): Promise<{
    paiementId: string;
    missionTitre: string;
    montant: number;
    moyensPaiement: {
      id: string;
      type: TypeMoyenPaiement;
      operateur: string | null;
      nomBanque: string | null;
      numero: string;
      nomTitulaire: string;
      principal: boolean;
    }[];
  }> {
    const transaction =
      await this.repo.findOne({
        where: { id: paiementId },
        relations: [
          'candidature',
          'candidature.mission',
        ],
      });

    if (!transaction) {
      throw new NotFoundException(
        'Paiement introuvable',
      );
    }

    // ============================================================
    // SECURITE
    // ============================================================

    if (
      !estAdmin &&
      transaction.clientId !== demandeurId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres paiements',
      );
    }

    // ============================================================
    // SNAPSHOT HISTORIQUE
    // ============================================================

    if (
      transaction.moyenPaiementId &&
      transaction.typeMoyenPaiement &&
      transaction.numeroPaiement &&
      transaction.nomTitulairePaiement
    ) {
      return {
        paiementId: transaction.id,

        missionTitre:
          transaction.candidature?.mission?.titre ??
          'Mission',

        montant:
          Number(transaction.montant),

        moyensPaiement: [
          {
            id:
              transaction.moyenPaiementId,

            type:
              transaction.typeMoyenPaiement,

            operateur:
              transaction.operateurPaiement ??
              null,

            nomBanque:
              transaction.nomBanquePaiement ??
              null,

            numero:
              transaction.numeroPaiement,

            nomTitulaire:
              transaction.nomTitulairePaiement,

            /**
             * Ici principal signifie :
             * "moyen utilisé pour cette transaction".
             *
             * Cela ne signifie pas que le moyen est encore
             * actuellement principal chez l'étudiant.
             */
            principal: true,
          },
        ],
      };
    }

    // ============================================================
    // COMPATIBILITE ANCIENNES TRANSACTIONS
    // ============================================================
    //
    // Les anciennes transactions peuvent ne pas posséder de snapshot.
    // Dans ce cas seulement, on conserve le comportement historique.
    // ============================================================

    const base =
      await this.moyensPourCandidature(
        transaction.candidatureId,
        demandeurId,
        estAdmin,
      );

    return {
      paiementId:
        transaction.id,

      missionTitre:
        base.missionTitre,

      montant:
        Number(transaction.montant),

      moyensPaiement:
        base.moyensPaiement,
    };
  }

  /**
   * Vérification serveur d'un paiement en ligne (MVola ou Papi) : le statut
   * est relu aupres du fournisseur, jamais deduit du retour navigateur.
   */
  async verifier(
    id: string,
    demandeurId: string,
    estAdmin = false,
  ): Promise<Transaction> {
    const transaction = await this.repo.findOne({
      where: { id },
      relations: ['candidature', 'candidature.mission', 'client', 'etudiant'],
    });

    if (!transaction) {
      throw new NotFoundException('Paiement introuvable');
    }

    if (!estAdmin && transaction.clientId !== demandeurId) {
      throw new ForbiddenException(
        'Vous ne pouvez verifier que vos propres paiements',
      );
    }

    if (transaction.statut !== StatutTransaction.EN_ATTENTE) {
      return transaction;
    }

    if (!this.estEnLigne(transaction)) {
      throw new BadRequestException(
        'Ce paiement est une declaration manuelle : sa verification se fait par un administrateur.',
      );
    }

    // Papi s'interroge par la reference marchande : la reference Papi n'est
    // pas indispensable (elle n'existe qu'apres une tentative).
    if (transaction.provider === 'papi') {
      try {
        return await this.verifierPapi(transaction, 'verification');
      } catch (error) {
        this.logger.error(
          `Verification Papi impossible pour ${transaction.reference} : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw this.exceptionVerification(error);
      }
    }

    if (!transaction.providerCorrelationId) {
      throw new BadRequestException(
        "Cette transaction n'a pas d'identifiant fournisseur : verification impossible",
      );
    }

    let statutFournisseur: StatutFournisseur;
    try {
      statutFournisseur = await this.statutAupresDuFournisseur(transaction);
    } catch (error) {
      this.logger.error(
        `Verification fournisseur impossible pour ${transaction.reference} (${transaction.provider}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException(MSG_VERIF_INDISPONIBLE);
    }

    transaction.providerStatut = statutFournisseur;

    if (statutFournisseur === 'completed') {
      return this.marquerConfirmee(transaction);
    }

    if (statutFournisseur === 'failed') {
      return this.marquerAnnulee(transaction);
    }

    // Mise a jour ciblee : un `save` complet pourrait ecraser une
    // confirmation survenue entre-temps (statut perime en memoire).
    await this.repo.update(
      { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
      { providerStatut: statutFournisseur },
    );

    return transaction;
  }

  /**
   * Traitement d'un webhook fournisseur (signature deja verifiee par le
   * controleur). Chaque notification est journalisee (evenements_paiement)
   * avec son issue, y compris les rejets.
   */
  async traiterWebhook(
    payload: WebhookPaiementPayload,
    fournisseurAttendu: 'mvola' | 'papi' = 'mvola',
  ): Promise<{ status: string }> {
    const suivi: { transactionId?: string } = {};
    let resultat = 'erreur';
    let codeHttp = 500;
    try {
      const reponse = await this.traiterWebhookInterne(payload, fournisseurAttendu, suivi);
      resultat = reponse.status;
      codeHttp = 201;
      return reponse;
    } catch (error) {
      if (error instanceof HttpException) {
        codeHttp = error.getStatus();
        resultat = `rejet:${error.message}`.slice(0, 60);
      }
      throw error;
    } finally {
      await this.journaliserEvenement(payload, fournisseurAttendu, suivi.transactionId, resultat, codeHttp);
    }
  }

  /** Ajout au journal des notifications ; jamais bloquant. */
  private async journaliserEvenement(
    payload: WebhookPaiementPayload,
    fournisseur: string,
    transactionId: string | undefined,
    resultat: string,
    codeHttp: number,
  ): Promise<void> {
    const court = (v: unknown, max: number) =>
      typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, max) : null;
    try {
      await this.evenementsRepo.insert({
        fournisseur,
        reference:
          court(payload?.merchantPaymentReference, 100) ??
          court(payload?.transactionReference, 100) ??
          court(payload?.reference, 100),
        referenceFournisseur:
          court(payload?.paymentReference, 100) ?? court(payload?.serverCorrelationId, 100),
        transactionId: transactionId ?? null,
        statutAnnonce: court(payload?.paymentStatus, 30) ?? court(payload?.status, 30),
        montantAnnonce: court(payload?.amount, 30),
        resultat,
        codeHttp,
      });
    } catch (error) {
      this.logger.warn(
        `Journal des notifications indisponible : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Le webhook n'est qu'une NOTIFICATION : le statut annonce dans le corps
   * n'est jamais cru. Meme avec une signature valide (secret divulgue,
   * corps rejoue), l'argent n'est confirme qu'apres relecture directe chez
   * le fournisseur. Un attaquant ne peut donc pas confirmer un paiement fictif.
   */
  private async traiterWebhookInterne(
    payload: WebhookPaiementPayload,
    fournisseurAttendu: 'mvola' | 'papi',
    suivi: { transactionId?: string },
  ): Promise<{ status: string }> {
    const texteCourt = (v: unknown): string | undefined =>
      typeof v === 'string' && v.length > 0 && v.length <= 100 ? v : undefined;

    // Papi : la notification porte notre reference dans
    // `merchantPaymentReference` ; `paymentReference` est l'UUID Papi de la
    // tentative : on ne s'en sert pas pour retrouver la transaction.
    const correlationId =
      fournisseurAttendu === 'papi'
        ? undefined
        : texteCourt(payload?.serverCorrelationId);
    const reference =
      fournisseurAttendu === 'papi'
        ? (texteCourt(payload?.merchantPaymentReference) ??
          texteCourt(payload?.reference))
        : texteCourt(payload?.transactionReference);

    if (!correlationId && !reference) {
      throw new BadRequestException('Notification invalide');
    }

    const transaction = await this.repo.findOne({
      where:
        fournisseurAttendu === 'papi'
          ? { reference, provider: 'papi' }
          : [
              ...(correlationId ? [{ providerCorrelationId: correlationId }] : []),
              ...(reference ? [{ reference }] : []),
            ],
      relations: ['candidature', 'candidature.mission', 'client', 'etudiant'],
    });

    if (!transaction) {
      this.logger.warn(
        `Webhook paiement : transaction inconnue (ref=${reference ?? '?'}, corrId=${correlationId ?? '?'})`,
      );
      throw new NotFoundException('Transaction inconnue');
    }
    suivi.transactionId = transaction.id;

    // Idempotence : une transaction deja traitee ne change plus (2xx pour
    // que le fournisseur ne la considere pas en echec).
    if (transaction.statut !== StatutTransaction.EN_ATTENTE) {
      return { status: 'ignored' };
    }

    // Un webhook ne peut agir que sur une transaction de SON fournisseur.
    if (
      transaction.provider !== fournisseurAttendu ||
      (fournisseurAttendu !== 'papi' && !transaction.providerCorrelationId)
    ) {
      throw new BadRequestException('Transaction non eligible a une notification');
    }

    // Coherence du montant annonce (quand la notification en contient un).
    if (payload.amount !== undefined && payload.amount !== null) {
      if (!memeMontant(payload.amount, transaction.montant)) {
        this.logger.error(
          `Webhook paiement : montant incoherent pour ${transaction.reference} (annonce=${String(payload.amount)}, attendu=${String(transaction.montant)}) : notification ignoree`,
        );
        throw new BadRequestException('Montant de la notification incoherent');
      }
    }

    if (fournisseurAttendu === 'papi') {
      // Devise annoncee : Papi ne regle que MGA.
      if (
        typeof payload.currency === 'string' &&
        payload.currency.trim().toUpperCase() !== (transaction.devise || DEVISE_PAPI).toUpperCase()
      ) {
        this.logger.error(
          `Webhook Papi : devise incoherente pour ${transaction.reference} (annonce=${payload.currency})`,
        );
        throw new BadRequestException('Devise de la notification incoherente');
      }

      // Controle d'authenticite documente, apres la signature.
      const jeton = await this.jetonNotification(transaction.id);
      if (jeton && payload.notificationToken !== jeton) {
        this.logger.error(
          `Webhook Papi : notificationToken different de celui du lien pour ${transaction.reference} : rejete`,
        );
        throw new UnauthorizedException('Notification non authentique');
      }

      // Relecture chez Papi (source de verite) puis controles de coherence.
      let apres: Transaction;
      try {
        apres = await this.verifierPapi(transaction, 'notification');
      } catch (error) {
        this.logger.error(
          `Webhook Papi : relecture impossible pour ${transaction.reference} : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // 503 : la notification pourra etre renvoyee depuis le tableau de
        // bord Papi ; la reconciliation la rattrapera de toute facon.
        throw new ServiceUnavailableException('Verification fournisseur indisponible');
      }
      if (apres.statut === StatutTransaction.CONFIRMEE || apres.statut === StatutTransaction.LIBEREE) {
        return { status: 'confirmed' };
      }
      if (apres.statut === StatutTransaction.ANNULEE) return { status: 'cancelled' };
      return {
        status: apres.providerStatut?.startsWith('anomalie_') ? 'anomaly' : 'pending',
      };
    }

    // MVola : verification aupres du fournisseur (source de verite).
    let statutFournisseur: StatutFournisseur;
    try {
      statutFournisseur = await this.statutAupresDuFournisseur(transaction);
    } catch (error) {
      this.logger.error(
        `Webhook paiement : verification fournisseur impossible pour ${transaction.reference} : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException('Verification fournisseur indisponible');
    }

    transaction.providerStatut = statutFournisseur;

    if (statutFournisseur === 'completed') {
      await this.marquerConfirmee(transaction);
      return { status: 'confirmed' };
    }

    if (statutFournisseur === 'failed') {
      await this.marquerAnnulee(transaction);
      return { status: 'cancelled' };
    }

    await this.repo.update(
      { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
      { providerStatut: statutFournisseur },
    );
    return { status: 'pending' };
  }

  /**
   * Confirmation manuelle par un administrateur.
   *
   * Un paiement MVola ne peut pas être confirmé manuellement.
   */
  async confirmer(
    id: string,
  ): Promise<Transaction> {
    const transaction =
      await this.repo.findOne({
        where: { id },
        relations: [
          'candidature',
          'candidature.mission',
          'client',
          'etudiant',
        ],
      });

    if (!transaction) {
      throw new NotFoundException(
        'Paiement introuvable',
      );
    }

    if (this.estEnLigne(transaction)) {
      throw new BadRequestException(
        'Un paiement en ligne (MVola / Papi) ne peut pas etre confirme manuellement : utilisez la verification fournisseur.',
      );
    }

    if (
      transaction.statut !==
      StatutTransaction.EN_ATTENTE
    ) {
      throw new BadRequestException(
        'Ce paiement a deja ete traite',
      );
    }

    return this.marquerConfirmee(
      transaction,
    );
  }

  /**
   * Annulation manuelle d'une déclaration.
   */
  async annuler(
    id: string,
  ): Promise<Transaction> {
    const transaction =
      await this.repo.findOne({
        where: { id },
        relations: [
          'candidature',
          'candidature.mission',
        ],
      });

    if (!transaction) {
      throw new NotFoundException(
        'Paiement introuvable',
      );
    }

    if (this.estEnLigne(transaction)) {
      throw new BadRequestException(
        'Un paiement en ligne (MVola / Papi) ne peut pas etre annule manuellement : son statut est gere par le fournisseur.',
      );
    }

    if (
      transaction.statut !==
      StatutTransaction.EN_ATTENTE
    ) {
      throw new BadRequestException(
        'Ce paiement a deja ete traite',
      );
    }

    // Transition atomique : un `save` complet pourrait ecraser une
    // confirmation commitee entre la lecture et l'ecriture.
    const resultat = await this.repo.update(
      { id: transaction.id, statut: StatutTransaction.EN_ATTENTE },
      { statut: StatutTransaction.ANNULEE },
    );

    if (!resultat.affected) {
      const aJour = await this.repo.findOne({
        where: { id },
        relations: ['candidature', 'candidature.mission'],
      });
      return aJour ?? transaction;
    }

    transaction.statut = StatutTransaction.ANNULEE;
    return transaction;
  }

  /**
   * Passage :
   *
   * EN_ATTENTE -> CONFIRMEE
   *
   * Source de vérité :
   * - fournisseur pour MVola ;
   * - administrateur pour une déclaration manuelle.
   */
  private async marquerConfirmee(
    transaction: Transaction,
  ): Promise<Transaction> {
    const maintenant =
      new Date();

    // Transition atomique.
    const resultat =
      await this.repo.update(
        {
          id: transaction.id,
          statut:
            StatutTransaction.EN_ATTENTE,
        },
        {
          statut:
            StatutTransaction.CONFIRMEE,
          dateConfirmation:
            maintenant,
        },
      );

    // Un autre processus a déjà effectué
    // la transition.
    if (
      !resultat.affected ||
      resultat.affected === 0
    ) {
      const aJour =
        await this.repo.findOne({
          where: {
            id: transaction.id,
          },
          relations: [
            'candidature',
            'candidature.mission',
            'client',
            'etudiant',
          ],
        });

      return (
        aJour ?? {
          ...transaction,
          statut:
            StatutTransaction.CONFIRMEE,
        }
      );
    }

    transaction.statut =
      StatutTransaction.CONFIRMEE;

    transaction.dateConfirmation =
      maintenant;

    const saved =
      transaction;

    // Facture du paiement confirme : jamais bloquante (si elle echoue,
    // elle est creee a la premiere consultation).
    await this.facturesService.genererSansBloquer(transaction.id);

    const titreMission =
      transaction.candidature?.mission
        ?.titre ?? 'Mission';

    const montant =
      Number(transaction.montant);

    // ============================================================
    // VERIFICATION LIVRAISON
    // ============================================================

    let livraisonValidee =
      false;

    try {
      const livraison =
        await this.livraisonsRepo.findOne({
          where: {
            candidatureId:
              transaction.candidatureId,
          },
        });

      livraisonValidee =
        livraison?.statut ===
        StatutLivraison.VALIDEE;
    } catch (error) {
      this.logger.warn(
        `Impossible de verifier la livraison pour la candidature ${transaction.candidatureId} : ${error}`,
      );
    }

    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    await this.notificationsService.creer({
      destinataireId:
        transaction.clientId,

      type:
        TypeNotification.PAIEMENT_CONFIRME,

      titre:
        'Paiement confirmé',

      message:
        `Votre paiement pour "${titreMission}" a été confirmé.`,

      lienUrl:
        '/tableau-de-bord/paiements',
    });

    await this.notificationsService.creer({
      destinataireId:
        transaction.etudiantId,

      type:
        TypeNotification.PAIEMENT_CONFIRME,

      titre:
        'Paiement confirmé',

      message: livraisonValidee
        ? `Le paiement pour "${titreMission}" a été confirmé et les fonds vous sont libérés.`
        : `Le paiement pour "${titreMission}" a été confirmé et sera libéré à la validation de la livraison.`,

      lienUrl:
        '/tableau-de-bord/paiements',
    });

    // ============================================================
    // EMAIL CLIENT
    // ============================================================

    if (transaction.client) {
      await this.emailService.envoyerPaiementConfirme(
        transaction.client.email,
        {
          nom:
            transaction.client.nom,

          titreMission,

          montant,

          reference:
            transaction.reference,
        },
      );
    }

    // ============================================================
    // EMAIL ETUDIANT
    // ============================================================

    if (transaction.etudiant) {
      await this.emailService.envoyerPaiementConfirme(
        transaction.etudiant.email,
        {
          nom:
            transaction.etudiant.nom,

          titreMission,

          montant,

          reference:
            transaction.reference,
        },
      );
    }

    // ============================================================
    // LIBERATION AUTOMATIQUE
    // ============================================================

    if (livraisonValidee) {
      try {
        await this.libererSiConfirmee(
          transaction.candidatureId,
        );
      } catch (error) {
        this.logger.error(
          `Liberation automatique impossible pour la candidature ${transaction.candidatureId} : ${error}`,
        );
      }
    }

    return saved;
  }

  /**
   * Passage :
   *
   * EN_ATTENTE -> ANNULEE
   */
  private async marquerAnnulee(
    transaction: Transaction,
  ): Promise<Transaction> {
    const resultat =
      await this.repo.update(
        {
          id: transaction.id,
          statut:
            StatutTransaction.EN_ATTENTE,
        },
        {
          statut:
            StatutTransaction.ANNULEE,
        },
      );

    if (
      !resultat.affected ||
      resultat.affected === 0
    ) {
      const aJour =
        await this.repo.findOne({
          where: {
            id: transaction.id,
          },
          relations: [
            'candidature',
            'candidature.mission',
          ],
        });

      return (
        aJour ?? {
          ...transaction,
          statut:
            StatutTransaction.ANNULEE,
        }
      );
    }

    transaction.statut =
      StatutTransaction.ANNULEE;

    const saved =
      transaction;

    await this.notificationsService.creer({
      destinataireId:
        transaction.clientId,

      type:
        TypeNotification.PAIEMENT_ECHOUE,

      titre:
        'Paiement non abouti',

      message:
        `Le paiement pour "${transaction.candidature?.mission?.titre ?? 'Mission'}" n'a pas abouti.`,

      lienUrl:
        '/tableau-de-bord/paiements',
    });

    return saved;
  }

  /**
   * Récupère l'adresse email d'un utilisateur.
   */
  private async emailDeUtilisateur(
    utilisateurId: string,
  ): Promise<string> {
    try {
      const utilisateur =
        await this.usersService.findById(
          utilisateurId,
        );

      return utilisateur?.email ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Libère automatiquement les fonds lorsqu'un paiement confirmé
   * correspond à une livraison validée.
   */
  async libererSiConfirmee(
    candidatureId: string,
  ): Promise<void> {
    const transaction =
      await this.repo.findOne({
        where: {
          candidatureId,
          statut:
            StatutTransaction.CONFIRMEE,
        },
        relations: [
          'candidature',
          'candidature.mission',
          'etudiant',
        ],
      });

    if (!transaction) {
      return;
    }

    // ============================================================
    // TRANSITION ATOMIQUE :
    // CONFIRMEE -> LIBEREE
    // ============================================================

    const resultat =
      await this.repo.update(
        {
          id: transaction.id,
          statut:
            StatutTransaction.CONFIRMEE,
        },
        {
          statut:
            StatutTransaction.LIBEREE,
          dateLiberation:
            new Date(),
        },
      );

    if (
      !resultat.affected ||
      resultat.affected === 0
    ) {
      return;
    }

    transaction.statut =
      StatutTransaction.LIBEREE;

    const titreMission =
      transaction.candidature.mission.titre;

    // ============================================================
    // NOTIFICATION ETUDIANT
    // ============================================================

    await this.notificationsService.creer({
      destinataireId:
        transaction.etudiantId,

      type:
        TypeNotification.PAIEMENT_LIBERE,

      titre:
        'Paiement libéré',

      message:
        `Les fonds pour "${titreMission}" ont été libérés suite à la validation de la livraison.`,

      lienUrl:
        '/tableau-de-bord/paiements',
    });

    // ============================================================
    // EMAIL ETUDIANT
    // ============================================================

    if (transaction.etudiant) {
      await this.emailService.envoyerPaiementLibere(
        transaction.etudiant.email,
        {
          nom:
            transaction.etudiant.nom,

          titreMission,

          montant:
            Number(transaction.montant),

          reference:
            transaction.reference,
        },
      );
    }
  }

  /**
   * Volume total des paiements confirmés ou libérés.
   */
  async sommeConfirmeeOuLiberee(): Promise<number> {
    const result =
      await this.repo
        .createQueryBuilder('t')
        .select(
          'COALESCE(SUM(t.montant), 0)',
          'total',
        )
        .where(
          't.statut IN (:...statuts)',
          {
            statuts: [
              StatutTransaction.CONFIRMEE,
              StatutTransaction.LIBEREE,
            ],
          },
        )
        .getRawOne<{
          total: string;
        }>();

    return Number(result?.total) || 0;
  }
}
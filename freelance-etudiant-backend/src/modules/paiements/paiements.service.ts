import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { QueryFailedError, Repository } from 'typeorm';

import { Transaction } from './entities/transaction.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { CreerPaiementDto } from './dto/creer-paiement.dto';
import {
  MethodePaiement,
  StatutTransaction,
} from '../../common/enums/statut-transaction.enum';
import { StatutLivraison } from '../../common/enums/statut-livraison.enum';
import { CandidaturesService } from '../candidatures/candidatures.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { MvolaService } from './mvola.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { MoyensPaiementService } from '../moyens-paiement/moyens-paiement.service';
import {
  OPERATEURS_PAR_DEFAUT,
  TypeMoyenPaiement,
} from '../moyens-paiement/enums/type-moyen-paiement.enum';

/** Charge utile normalisee du webhook fournisseur. */
export interface WebhookPaiementPayload {
  transactionReference?: string;
  serverCorrelationId?: string;
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

@Injectable()
export class PaiementsService {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,

    @InjectRepository(Livraison)
    private readonly livraisonsRepo: Repository<Livraison>,

    private readonly candidaturesService: CandidaturesService,

    private readonly notificationsService: NotificationsService,

    private readonly mvolaService: MvolaService,

    private readonly emailService: EmailService,

    private readonly usersService: UsersService,

    private readonly moyensPaiementService: MoyensPaiementService,
  ) {}

  /**
   * Création d'un paiement pour une candidature acceptée dont la livraison
   * a été validée par le client.
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
   *    - le client doit sélectionner le moyen de paiement du bénéficiaire ;
   *    - le paiement reste en attente jusqu'à vérification administrative.
   *
   * Orange Money et Airtel Money ne sont pas encore disponibles comme
   * méthodes de paiement en ligne.
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
      throw new ServiceUnavailableException(
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
    // REGLE FIN DE PROJET :
    // LE PAIEMENT EST POSSIBLE UNIQUEMENT APRES VALIDATION
    // DE LA LIVRAISON
    // ============================================================

    const livraison = await this.livraisonsRepo.findOne({
      where: { candidatureId },
    });

    if (!livraison || livraison.statut !== StatutLivraison.VALIDEE) {
      throw new BadRequestException(
        "Vous devez d'abord valider la livraison avant d'effectuer le paiement.",
      );
    }

    // ============================================================
    // RG-PAY :
    // POUR UNE DECLARATION MANUELLE, LE CLIENT DOIT CHOISIR
    // LE MOYEN DE PAIEMENT DE L'ETUDIANT BENEFICIAIRE.
    // ============================================================

    if (
      dto.methode === MethodePaiement.VIREMENT &&
      !dto.moyenPaiementId
    ) {
      throw new BadRequestException(
        "Vous devez sélectionner le moyen de paiement de l'étudiant bénéficiaire avant de déclarer le virement.",
      );
    }

    // ============================================================
    // UNE SEULE TRANSACTION ACTIVE PAR CANDIDATURE
    // ============================================================

    const existante = await this.repo.findOne({
      where: { candidatureId },
    });

    if (
      existante &&
      existante.statut !== StatutTransaction.ANNULEE
    ) {
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
    // SNAPSHOT DU MOYEN DE PAIEMENT BENEFICIAIRE
    //
    // Le moyen doit appartenir à l'étudiant bénéficiaire et être actif.
    // Les coordonnées sont ensuite copiées dans la transaction.
    // ============================================================

    const snapshot = await this.resoudreSnapshot(
      dto.moyenPaiementId,
      candidature.etudiant.utilisateurId,
    );

    // ============================================================
    // PAIEMENT MVOLA
    // ============================================================

    if (dto.methode === MethodePaiement.MVOLA) {
      return this.creerPaiementMvola(
        candidature,
        candidatureId,
        clientId,
        dto,
        montantConvenu,
        snapshot,
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
    dto: CreerPaiementDto,
    montantConvenu: number,
    snapshot: Partial<SnapshotMoyenPaiement> = {},
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

    let initiation: {
      serverCorrelationId: string;
      statut: string;
    };

    try {
      initiation = await this.mvolaService.initierPaiement({
        montantAr: montantConvenu,
        transactionReference: reference,
        telephoneDebite: dto.telephoneDebite as string,
        description: `Paiement mission "${candidature.mission.titre}" - KIANJA`,
      });
    } catch (error) {
      this.logger.error(
        `Echec d'initiation MVola pour la candidature ${candidatureId} : ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );

      throw new ServiceUnavailableException(
        'Le fournisseur de paiement MVola a refuse la transaction. Verifiez votre numero et reessayez.',
      );
    }

    const transaction = this.repo.create({
      candidatureId,
      clientId,
      etudiantId: candidature.etudiant.utilisateurId,
      montant: montantConvenu,
      methode: MethodePaiement.MVOLA,
      reference,
      statut: StatutTransaction.EN_ATTENTE,
      provider: 'mvola',
      providerCorrelationId: initiation.serverCorrelationId,
      telephoneDebite: dto.telephoneDebite,
      providerStatut: initiation.statut,

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
    return this.repo.find({
      where: { clientId },
      relations: [
        'candidature',
        'candidature.mission',
      ],
      order: {
        dateCreation: 'DESC',
      },
    });
  }

  /**
   * Transactions reçues par un étudiant.
   */
  async findByEtudiant(
    etudiantId: string,
  ): Promise<Transaction[]> {
    return this.repo.find({
      where: { etudiantId },
      relations: [
        'candidature',
        'candidature.mission',
      ],
      order: {
        dateCreation: 'DESC',
      },
    });
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
   * Chaîne d'autorisation :
   *
   * client authentifié
   *      ↓
   * candidature
   *      ↓
   * mission appartenant au client
   *      ↓
   * livraison validée
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

    // Les coordonnées ne sont accessibles qu'après
    // validation de la livraison.
    const livraison =
      await this.livraisonsRepo.findOne({
        where: { candidatureId },
      });

    if (
      !livraison ||
      livraison.statut !== StatutLivraison.VALIDEE
    ) {
      throw new BadRequestException(
        "Le paiement n'est pas encore du : la livraison n'a pas ete validee.",
      );
    }

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
   * Vérification serveur d'un paiement MVola.
   */
  async verifier(
    id: string,
    demandeurId: string,
    estAdmin = false,
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

    if (
      !estAdmin &&
      transaction.clientId !== demandeurId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez verifier que vos propres paiements',
      );
    }

    if (
      transaction.statut !==
      StatutTransaction.EN_ATTENTE
    ) {
      return transaction;
    }

    if (
      transaction.provider !== 'mvola'
    ) {
      throw new BadRequestException(
        'Ce paiement est une declaration manuelle : sa verification se fait par un administrateur.',
      );
    }

    if (!transaction.providerCorrelationId) {
      throw new BadRequestException(
        "Cette transaction n'a pas d'identifiant fournisseur : verification impossible",
      );
    }

    const statutFournisseur =
      await this.mvolaService.verifierStatut(
        transaction.providerCorrelationId,
      );

    transaction.providerStatut =
      statutFournisseur;

    if (
      statutFournisseur === 'completed'
    ) {
      return this.marquerConfirmee(
        transaction,
      );
    }

    if (
      statutFournisseur === 'failed'
    ) {
      return this.marquerAnnulee(
        transaction,
      );
    }

    await this.repo.save(transaction);

    return transaction;
  }

  /**
   * Traitement du webhook MVola.
   */
  async traiterWebhook(
    payload: WebhookPaiementPayload,
  ): Promise<{ status: string }> {
    const transaction =
      await this.repo.findOne({
        where: [
          {
            providerCorrelationId:
              payload.serverCorrelationId ??
              '__none__',
          },
          {
            reference:
              payload.transactionReference ??
              '__none__',
          },
        ],
        relations: [
          'candidature',
          'candidature.mission',
          'client',
          'etudiant',
        ],
      });

    if (!transaction) {
      this.logger.warn(
        `Webhook paiement : transaction inconnue (ref=${payload.transactionReference ?? '?'}, corrId=${payload.serverCorrelationId ?? '?'})`,
      );

      throw new NotFoundException(
        'Transaction inconnue',
      );
    }

    // Vérification du montant.
    if (
      payload.amount !== undefined &&
      Number(payload.amount) !==
        Number(transaction.montant)
    ) {
      this.logger.error(
        `Webhook paiement : montant falsifie pour ${transaction.reference} (recu ${payload.amount}, attendu ${transaction.montant})`,
      );

      throw new BadRequestException(
        'Montant incoherent',
      );
    }

    // Idempotence.
    if (
      transaction.statut !==
      StatutTransaction.EN_ATTENTE
    ) {
      return {
        status: 'ignored',
      };
    }

    const brut =
      (payload.status ?? '').toLowerCase();

    if (
      brut === 'completed' ||
      brut === 'success' ||
      brut === 'successful'
    ) {
      await this.marquerConfirmee(
        transaction,
      );

      return {
        status: 'confirmed',
      };
    }

    if (
      brut === 'failed' ||
      brut === 'rejected' ||
      brut === 'expired'
    ) {
      await this.marquerAnnulee(
        transaction,
      );

      return {
        status: 'cancelled',
      };
    }

    transaction.providerStatut =
      brut ||
      transaction.providerStatut;

    await this.repo.save(transaction);

    return {
      status: 'pending',
    };
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

    if (
      transaction.provider === 'mvola'
    ) {
      throw new BadRequestException(
        'Un paiement MVola en ligne ne peut pas etre confirme manuellement : utilisez la verification fournisseur.',
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

    if (
      transaction.provider === 'mvola'
    ) {
      throw new BadRequestException(
        'Un paiement MVola en ligne ne peut pas etre annule manuellement : son statut est gere par le fournisseur.',
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

    transaction.statut =
      StatutTransaction.ANNULEE;

    return this.repo.save(
      transaction,
    );
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
        TypeNotification.PAIEMENT_CONFIRME,

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
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { CreerPaiementDto } from './dto/creer-paiement.dto';
import { MethodePaiement, StatutTransaction } from '../../common/enums/statut-transaction.enum';
import { StatutLivraison } from '../../common/enums/statut-livraison.enum';
import { CandidaturesService } from '../candidatures/candidatures.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { MvolaService } from './mvola.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

/** Charge utile normalisee du webhook fournisseur. */
export interface WebhookPaiementPayload {
  transactionReference?: string;
  serverCorrelationId?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
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
  ) {}

  /**
   * Deux voies de paiement pour une candidature acceptee DONT LA LIVRAISON
   * A ETE VALIDEE par le client (regle metier de fin de projet) :
   * - MVola (methode 'mvola') : paiement EN LIGNE REEL via l'API MVola.
   *   Le backend genere la reference, demande le debit du numero payeur
   *   au fournisseur, puis la confirmation se fait uniquement par
   *   verification serveur (polling GET status / webhook signe).
   *   Le frontend ne peut JAMAIS marquer un paiement "confirme".
   * - Virement : declaration manuelle d'un transfert hors plateforme
   *   (reference saisie), en attente de verification par un
   *   administrateur — processus metier existant, conserve.
   * - orange_money / airtel_money : aucune API self-service disponible
   *   pour Madagascar -> refuse explicitement (pas de simulation).
   */
  async creer(
    candidatureId: string,
    clientId: string,
    dto: CreerPaiementDto,
  ): Promise<Transaction> {
    if (
      dto.methode === MethodePaiement.ORANGE_MONEY ||
      dto.methode === MethodePaiement.AIRTEL_MONEY
    ) {
      throw new ServiceUnavailableException(
        "Ce moyen de paiement n'est pas encore disponible sur la plateforme. Utilisez MVola ou le virement bancaire.",
      );
    }

    const candidature = await this.candidaturesService.findOne(candidatureId);
    if (candidature.mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez payer que vos propres missions',
      );
    }
    this.candidaturesService.assertCandidatureAcceptee(candidature);

    // ============================================================
    // RG (fin de projet) : le client ne peut payer QU'APRES avoir
    // valide la livraison de cette candidature. Verification faite
    // cote backend : un appel direct a l'API de paiement est bloque
    // si la livraison n'existe pas ou n'est pas validee.
    // ============================================================
    const livraison = await this.livraisonsRepo.findOne({
      where: { candidatureId },
    });
    if (!livraison || livraison.statut !== StatutLivraison.VALIDEE) {
      throw new BadRequestException(
        "Vous devez d'abord valider la livraison avant d'effectuer le paiement.",
      );
    }

    const existante = await this.repo.findOne({ where: { candidatureId } });
    if (existante && existante.statut !== StatutTransaction.ANNULEE) {
      throw new BadRequestException(
        'Un paiement existe deja pour cette candidature',
      );
    }

    if (dto.methode === MethodePaiement.MVOLA) {
      return this.creerPaiementMvola(candidature, candidatureId, clientId, dto);
    }

    // ---- Declaration manuelle (virement bancaire) ----
    const transaction = this.repo.create({
      candidatureId,
      clientId,
      etudiantId: candidature.etudiant.utilisateurId,
      montant: dto.montant,
      methode: dto.methode,
      reference: dto.reference as string,
      statut: StatutTransaction.EN_ATTENTE,
      provider: 'manuel',
    });
    const saved = await this.repo.save(transaction);

    await this.notificationsService.creer({
      destinataireId: candidature.etudiant.utilisateurId,
      type: TypeNotification.PAIEMENT_INITIE,
      titre: 'Paiement déclaré',
      message: `Le client a déclaré un paiement de ${dto.montant} Ar pour "${candidature.mission.titre}".`,
      lienUrl: '/tableau-de-bord/paiements',
    });
    await this.emailService.envoyerPaiementInitie(
      await this.emailDeUtilisateur(candidature.etudiant.utilisateurId),
      {
        nom: candidature.etudiant.utilisateur?.nom ?? 'Etudiant',
        titreMission: candidature.mission.titre,
        montant: Number(dto.montant),
        reference: saved.reference,
      },
    );

    return saved;
  }

  /**
   * Paiement MVola reel : initiation aupres du fournisseur AVANT toute
   * ecriture en base. En cas d'echec fournisseur, aucune transaction
   * fantome n'est conservee. La reference KIANJA sert de
   * transactionReference MVola, le serverCorrelationId renvoye servira
   * a la verification serveur.
   */
  private async creerPaiementMvola(
    candidature: Awaited<ReturnType<CandidaturesService['findOne']>>,
    candidatureId: string,
    clientId: string,
    dto: CreerPaiementDto,
  ): Promise<Transaction> {
    if (!this.mvolaService.estConfigure) {
      throw new ServiceUnavailableException(
        "Le paiement MVola en ligne n'est pas actif sur la plateforme. Configurez les identifiants marchands (MVOLA_*) ou utilisez le virement.",
      );
    }

    const reference = `KIANJA-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    let initiation: {
      serverCorrelationId: string;
      statut: string;
    };
    try {
      initiation = await this.mvolaService.initierPaiement({
        montantAr: Number(dto.montant),
        transactionReference: reference,
        telephoneDebite: dto.telephoneDebite as string,
        description: `Paiement mission "${candidature.mission.titre}" - KIANJA`,
      });
    } catch (error) {
      this.logger.error(
        `Echec d'initiation MVola pour la candidature ${candidatureId} : ${
          error instanceof Error ? error.message : String(error)
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
      montant: dto.montant,
      methode: MethodePaiement.MVOLA,
      reference,
      statut: StatutTransaction.EN_ATTENTE,
      provider: 'mvola',
      providerCorrelationId: initiation.serverCorrelationId,
      telephoneDebite: dto.telephoneDebite,
      providerStatut: initiation.statut,
    });
    const saved = await this.repo.save(transaction);

    await this.notificationsService.creer({
      destinataireId: candidature.etudiant.utilisateurId,
      type: TypeNotification.PAIEMENT_INITIE,
      titre: 'Paiement initié',
      message: `Un paiement MVola de ${dto.montant} Ar est en attente de confirmation pour "${candidature.mission.titre}".`,
      lienUrl: '/tableau-de-bord/paiements',
    });
    await this.emailService.envoyerPaiementInitie(
      await this.emailDeUtilisateur(candidature.etudiant.utilisateurId),
      {
        nom: candidature.etudiant.utilisateur?.nom ?? 'Etudiant',
        titreMission: candidature.mission.titre,
        montant: Number(dto.montant),
        reference,
      },
    );

    return saved;
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.repo.findOne({
      where: { id },
      relations: ['candidature', 'candidature.mission'],
    });
    if (!transaction) {
      throw new NotFoundException('Paiement introuvable');
    }
    return transaction;
  }

  async findAll(statut?: StatutTransaction): Promise<Transaction[]> {
    return this.repo.find({
      where: statut ? { statut } : {},
      relations: ['candidature', 'candidature.mission', 'client', 'etudiant'],
      order: { dateCreation: 'DESC' },
    });
  }

  async findByClient(clientId: string): Promise<Transaction[]> {
    return this.repo.find({
      where: { clientId },
      relations: ['candidature', 'candidature.mission'],
      order: { dateCreation: 'DESC' },
    });
  }

  async findByEtudiant(etudiantId: string): Promise<Transaction[]> {
    return this.repo.find({
      where: { etudiantId },
      relations: ['candidature', 'candidature.mission'],
      order: { dateCreation: 'DESC' },
    });
  }

  /**
   * Verification serveur d'un paiement MVola (polling aupres du
   * fournisseur). Appellee par le client proprietaire (ou l'admin) pour
   * rafraichir le statut reel ; c'est la SEULE voie de confirmation pour
   * un paiement en ligne, a cote du webhook signe. Idempotent : si la
   * transaction n'est plus en attente, elle est renvoyee sans action.
   */
  async verifier(id: string, demandeurId: string, estAdmin = false): Promise<Transaction> {
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
      return transaction; // idempotent : deja traite
    }

    if (transaction.provider !== 'mvola') {
      throw new BadRequestException(
        'Ce paiement est une declaration manuelle : sa verification se fait par un administrateur.',
      );
    }
    if (!transaction.providerCorrelationId) {
      throw new BadRequestException(
        "Cette transaction n'a pas d'identifiant fournisseur : verification impossible",
      );
    }

    const statutFournisseur = await this.mvolaService.verifierStatut(
      transaction.providerCorrelationId,
    );
    transaction.providerStatut = statutFournisseur;

    if (statutFournisseur === 'completed') {
      return this.marquerConfirmee(transaction);
    }
    if (statutFournisseur === 'failed') {
      return this.marquerAnnulee(transaction);
    }

    // Toujours en attente cote fournisseur
    await this.repo.save(transaction);
    return transaction;
  }

  /**
   * Traitement du webhook fournisseur (controle de signature HMAC fait
   * dans le controleur). Regles de securite :
   * - transaction inconnue -> 404 (pas d'effet de bord) ;
   * - montant fourni different du montant initie -> 400 (rejet) ;
   * - transaction deja traitee (doublon / replay) -> 200 'ignored',
   *   une seule operation metier jamais produite.
   */
  async traiterWebhook(payload: WebhookPaiementPayload): Promise<{ status: string }> {
    const transaction = await this.repo.findOne({
      where: [
        { providerCorrelationId: payload.serverCorrelationId ?? '__none__' },
        { reference: payload.transactionReference ?? '__none__' },
      ],
      relations: ['candidature', 'candidature.mission', 'client', 'etudiant'],
    });

    if (!transaction) {
      this.logger.warn(
        `Webhook paiement : transaction inconnue (ref=${payload.transactionReference ?? '?'}, corrId=${payload.serverCorrelationId ?? '?'})`,
      );
      throw new NotFoundException('Transaction inconnue');
    }

    // Montant falsifie : le montant confirme doit correspondre a celui
    // initie avec le fournisseur.
    if (
      payload.amount !== undefined &&
      Number(payload.amount) !== Number(transaction.montant)
    ) {
      this.logger.error(
        `Webhook paiement : montant falsifie pour ${transaction.reference} (recu ${payload.amount}, attendu ${transaction.montant})`,
      );
      throw new BadRequestException('Montant incoherent');
    }

    // Idempotence : un webhook rejoue ne produit jamais une deuxieme
    // operation metier.
    if (transaction.statut !== StatutTransaction.EN_ATTENTE) {
      return { status: 'ignored' };
    }

    const brut = (payload.status ?? '').toLowerCase();
    if (brut === 'completed' || brut === 'success' || brut === 'successful') {
      await this.marquerConfirmee(transaction);
      return { status: 'confirmed' };
    }
    if (brut === 'failed' || brut === 'rejected' || brut === 'expired') {
      await this.marquerAnnulee(transaction);
      return { status: 'cancelled' };
    }

    transaction.providerStatut = brut || transaction.providerStatut;
    await this.repo.save(transaction);
    return { status: 'pending' };
  }

  /**
   * Confirmation MANUELLE par un administrateur (reception effective des
   * fonds d'un virement hors plateforme). Interdite pour les paiements
   * en ligne (MVola) : leur source de verite est le fournisseur, via
   * verifier() ou le webhook.
   */
  async confirmer(id: string): Promise<Transaction> {
    const transaction = await this.repo.findOne({
      where: { id },
      relations: ['candidature', 'candidature.mission', 'client', 'etudiant'],
    });
    if (!transaction) {
      throw new NotFoundException('Paiement introuvable');
    }
    if (transaction.provider === 'mvola') {
      throw new BadRequestException(
        'Un paiement MVola en ligne ne peut pas etre confirme manuellement : utilisez la verification fournisseur.',
      );
    }
    if (transaction.statut !== StatutTransaction.EN_ATTENTE) {
      throw new BadRequestException('Ce paiement a deja ete traite');
    }
    return this.marquerConfirmee(transaction);
  }

  async annuler(id: string): Promise<Transaction> {
    const transaction = await this.repo.findOne({
      where: { id },
      relations: ['candidature', 'candidature.mission'],
    });
    if (!transaction) {
      throw new NotFoundException('Paiement introuvable');
    }
    if (transaction.provider === 'mvola') {
      throw new BadRequestException(
        'Un paiement MVola en ligne ne peut pas etre annule manuellement : son statut est gere par le fournisseur.',
      );
    }
    if (transaction.statut !== StatutTransaction.EN_ATTENTE) {
      throw new BadRequestException('Ce paiement a deja ete traite');
    }
    transaction.statut = StatutTransaction.ANNULEE;
    return this.repo.save(transaction);
  }

  /**
   * Passage EN_ATTENTE -> CONFIRMEE (source de verite : fournisseur ou
   * admin pour un virement). Une seule operation metier : notification
   * + email client et etudiant.
   * Regle metier de fin de projet : la confirmation d'un paiement ne
   * devient possible qu'apres validation de la livraison ; les fonds
   * sont donc liberer automatiquement ici si la livraison correspondante
   * est deja validee (flux : validation -> paiement -> liberation).
   */
  private async marquerConfirmee(transaction: Transaction): Promise<Transaction> {
    transaction.statut = StatutTransaction.CONFIRMEE;
    transaction.dateConfirmation = new Date();
    const saved = await this.repo.save(transaction);

    const titreMission =
      transaction.candidature?.mission?.titre ?? 'Mission';
    const montant = Number(transaction.montant);

    // Livraison deja validee ? Dans le flux obligatoire
    // (validation -> paiement -> evaluation), le paiement est confirme
    // APRES la validation : on libere donc immediatement les fonds.
    let livraisonValidee = false;
    try {
      const livraison = await this.livraisonsRepo.findOne({
        where: { candidatureId: transaction.candidatureId },
      });
      livraisonValidee = livraison?.statut === StatutLivraison.VALIDEE;
    } catch (error) {
      this.logger.warn(
        `Impossible de verifier la livraison pour la candidature ${transaction.candidatureId} : ${error}`,
      );
    }

    await this.notificationsService.creer({
      destinataireId: transaction.clientId,
      type: TypeNotification.PAIEMENT_CONFIRME,
      titre: 'Paiement confirmé',
      message: `Votre paiement pour "${titreMission}" a été confirmé.`,
      lienUrl: '/tableau-de-bord/paiements',
    });
    await this.notificationsService.creer({
      destinataireId: transaction.etudiantId,
      type: TypeNotification.PAIEMENT_CONFIRME,
      titre: 'Paiement confirmé',
      message: livraisonValidee
        ? `Le paiement pour "${titreMission}" a été confirmé et les fonds vous sont libérés.`
        : `Le paiement pour "${titreMission}" a été confirmé et sera libéré à la validation de la livraison.`,
      lienUrl: '/tableau-de-bord/paiements',
    });

    if (transaction.client) {
      await this.emailService.envoyerPaiementConfirme(
        transaction.client.email,
        {
          nom: transaction.client.nom,
          titreMission,
          montant,
          reference: transaction.reference,
        },
      );
    }
    if (transaction.etudiant) {
      await this.emailService.envoyerPaiementConfirme(
        transaction.etudiant.email,
        {
          nom: transaction.etudiant.nom,
          titreMission,
          montant,
          reference: transaction.reference,
        },
      );
    }

    // Liberation automatique des fonds si la livraison est deja validee
    // (le client a paye apres avoir valide la livraison). Non bloquant :
    // un echec ici ne doit jamais invalider la confirmation du paiement.
    if (livraisonValidee) {
      try {
        await this.libererSiConfirmee(transaction.candidatureId);
      } catch (error) {
        this.logger.error(
          `Liberation automatique impossible pour la candidature ${transaction.candidatureId} : ${error}`,
        );
      }
    }

    return saved;
  }

  /** Passage EN_ATTENTE -> ANNULEE (echec fournisseur ou rejet admin). */
  private async marquerAnnulee(transaction: Transaction): Promise<Transaction> {
    transaction.statut = StatutTransaction.ANNULEE;
    const saved = await this.repo.save(transaction);

    await this.notificationsService.creer({
      destinataireId: transaction.clientId,
      type: TypeNotification.PAIEMENT_CONFIRME,
      titre: 'Paiement non abouti',
      message: `Le paiement pour "${transaction.candidature?.mission?.titre ?? 'Mission'}" n'a pas abouti.`,
      lienUrl: '/tableau-de-bord/paiements',
    });

    return saved;
  }

  /** Email d'un utilisateur avec repli silencieux (l'email est secondaire). */
  private async emailDeUtilisateur(utilisateurId: string): Promise<string> {
    try {
      const utilisateur = await this.usersService.findById(utilisateurId);
      return utilisateur?.email ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Libere automatiquement les fonds d'une candidature lorsque sa
   * livraison est validee par le client (appele par LivraisonsService).
   * N'echoue jamais : l'absence de transaction confirmee est normale si le
   * client n'a pas encore paye.
   */
  async libererSiConfirmee(candidatureId: string): Promise<void> {
    const transaction = await this.repo.findOne({
      where: { candidatureId, statut: StatutTransaction.CONFIRMEE },
      relations: ['candidature', 'candidature.mission', 'etudiant'],
    });
    if (!transaction) return;

    transaction.statut = StatutTransaction.LIBEREE;
    transaction.dateLiberation = new Date();
    await this.repo.save(transaction);

    const titreMission = transaction.candidature.mission.titre;

    await this.notificationsService.creer({
      destinataireId: transaction.etudiantId,
      type: TypeNotification.PAIEMENT_LIBERE,
      titre: 'Paiement libéré',
      message: `Les fonds pour "${titreMission}" ont été libérés suite à la validation de la livraison.`,
      lienUrl: '/tableau-de-bord/paiements',
    });

    if (transaction.etudiant) {
      await this.emailService.envoyerPaiementLibere(transaction.etudiant.email, {
        nom: transaction.etudiant.nom,
        titreMission,
        montant: Number(transaction.montant),
        reference: transaction.reference,
      });
    }
  }

  /**
   * Utilise par StatistiquesService pour calculer le volume d'affaires
   * reel (fonds confirmes ou liberes) plutot qu'un placeholder.
   */
  async sommeConfirmeeOuLiberee(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.montant), 0)', 'total')
      .where('t.statut IN (:...statuts)', {
        statuts: [StatutTransaction.CONFIRMEE, StatutTransaction.LIBEREE],
      })
      .getRawOne<{ total: string }>();
    return Number(result?.total) || 0;
  }
}

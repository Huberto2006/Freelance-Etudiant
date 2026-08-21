import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreerPaiementDto } from './dto/creer-paiement.dto';
import { StatutTransaction } from '../../common/enums/statut-transaction.enum';
import { CandidaturesService } from '../candidatures/candidatures.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

@Injectable()
export class PaiementsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
    private readonly candidaturesService: CandidaturesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Le client declare un paiement pour une candidature acceptee (le
   * transfert mobile money a deja ete effectue hors plateforme ; seule la
   * reference est saisie ici, en attente de verification admin).
   */
  async creer(
    candidatureId: string,
    clientId: string,
    dto: CreerPaiementDto,
  ): Promise<Transaction> {
    const candidature = await this.candidaturesService.findOne(candidatureId);
    if (candidature.mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez payer que vos propres missions',
      );
    }
    this.candidaturesService.assertCandidatureAcceptee(candidature);

    const existante = await this.repo.findOne({ where: { candidatureId } });
    if (existante && existante.statut !== StatutTransaction.ANNULEE) {
      throw new BadRequestException(
        'Un paiement existe deja pour cette candidature',
      );
    }

    const transaction = this.repo.create({
      candidatureId,
      clientId,
      etudiantId: candidature.etudiant.utilisateurId,
      montant: dto.montant,
      methode: dto.methode,
      reference: dto.reference,
      statut: StatutTransaction.EN_ATTENTE,
    });
    const saved = await this.repo.save(transaction);

    await this.notificationsService.creer({
      destinataireId: candidature.etudiant.utilisateurId,
      type: TypeNotification.PAIEMENT_INITIE,
      titre: 'Paiement déclaré',
      message: `Le client a déclaré un paiement de ${dto.montant} Ar pour "${candidature.mission.titre}".`,
      lienUrl: '/tableau-de-bord/paiements',
    });

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
   * Un administrateur confirme avoir verifie la reception effective des
   * fonds (extrait de compte / capture d'ecran mobile money).
   */
  async confirmer(id: string): Promise<Transaction> {
    const transaction = await this.findOne(id);
    if (transaction.statut !== StatutTransaction.EN_ATTENTE) {
      throw new BadRequestException('Ce paiement a deja ete traite');
    }
    transaction.statut = StatutTransaction.CONFIRMEE;
    transaction.dateConfirmation = new Date();
    const saved = await this.repo.save(transaction);

    await this.notificationsService.creer({
      destinataireId: transaction.clientId,
      type: TypeNotification.PAIEMENT_CONFIRME,
      titre: 'Paiement confirmé',
      message: `Votre paiement pour "${transaction.candidature.mission.titre}" a été confirmé.`,
      lienUrl: '/tableau-de-bord/paiements',
    });
    await this.notificationsService.creer({
      destinataireId: transaction.etudiantId,
      type: TypeNotification.PAIEMENT_CONFIRME,
      titre: 'Paiement confirmé',
      message: `Le paiement pour "${transaction.candidature.mission.titre}" a été confirmé et sera libéré à la validation de la livraison.`,
      lienUrl: '/tableau-de-bord/paiements',
    });

    return saved;
  }

  async annuler(id: string): Promise<Transaction> {
    const transaction = await this.findOne(id);
    if (transaction.statut !== StatutTransaction.EN_ATTENTE) {
      throw new BadRequestException('Ce paiement a deja ete traite');
    }
    transaction.statut = StatutTransaction.ANNULEE;
    return this.repo.save(transaction);
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
      relations: ['candidature', 'candidature.mission'],
    });
    if (!transaction) return;

    transaction.statut = StatutTransaction.LIBEREE;
    transaction.dateLiberation = new Date();
    await this.repo.save(transaction);

    await this.notificationsService.creer({
      destinataireId: transaction.etudiantId,
      type: TypeNotification.PAIEMENT_LIBERE,
      titre: 'Paiement libéré',
      message: `Les fonds pour "${transaction.candidature.mission.titre}" ont été libérés suite à la validation de la livraison.`,
      lienUrl: '/tableau-de-bord/paiements',
    });
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

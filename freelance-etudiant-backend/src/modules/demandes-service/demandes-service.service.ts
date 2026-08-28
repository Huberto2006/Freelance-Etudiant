import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemandeService } from './entities/demande-service.entity';
import { CreerDemandeServiceDto } from './dto/creer-demande-service.dto';
import { StatutDemandeService } from '../../common/enums/statut-demande-service.enum';
import { ServicesService } from '../services/services.service';
import { MissionsService } from '../missions/missions.service';
import { CandidaturesService } from '../candidatures/candidatures.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class DemandesServiceService {
  constructor(
    @InjectRepository(DemandeService)
    private readonly repo: Repository<DemandeService>,
    private readonly servicesService: ServicesService,
    private readonly missionsService: MissionsService,
    private readonly candidaturesService: CandidaturesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * RGds1 : le client commande un service en fournissant un cahier des
   * charges. Le budget/delai proposes reprennent par defaut ceux affiches
   * par l'etudiant, mais le client peut les ajuster.
   */
  async creer(
    serviceId: string,
    clientId: string,
    dto: CreerDemandeServiceDto,
  ): Promise<DemandeService> {
    const service = await this.servicesService.findOne(serviceId);

    if (!service.disponible) {
      throw new BadRequestException("Ce service n'est plus disponible");
    }
    if (service.etudiant?.utilisateurId === clientId) {
      throw new BadRequestException(
        'Vous ne pouvez pas commander votre propre service',
      );
    }

    const demande = this.repo.create({
      serviceId,
      clientId,
      cahierDesCharges: dto.cahierDesCharges,
      budgetPropose: dto.budgetPropose ?? Number(service.prix),
      delaiSouhaite: dto.delaiSouhaite ?? service.delai,
      pieceJointeUrl: dto.pieceJointeUrl,
      pieceJointeNom: dto.pieceJointeNom,
      statut: StatutDemandeService.EN_ATTENTE,
    });
    const saved = await this.repo.save(demande);

    await this.notificationsService.creer({
      destinataireId: service.etudiantId,
      type: TypeNotification.NOUVELLE_CANDIDATURE,
      titre: 'Nouvelle demande de service',
      message: `Un client souhaite commander votre service "${service.titre}".`,
      lienUrl: '/tableau-de-bord/mes-services',
    });

    return saved;
  }

  async findOne(id: string): Promise<DemandeService> {
    const demande = await this.repo.findOne({
      where: { id },
      relations: [
        'service',
        'service.etudiant',
        'service.etudiant.utilisateur',
        'client',
      ],
    });
    if (!demande) {
      throw new NotFoundException('Demande de service introuvable');
    }
    return demande;
  }

  /**
   * Consultation d'une demande de service restreinte aux acteurs de la
   * demande : le client qui l'a passee, l'etudiant fournisseur du service,
   * ou un administrateur. Corrige une faille IDOR : le cahier des charges
   * est une donnee privee qui ne doit pas etre lisible par n'importe quel
   * utilisateur authentife devinant l'identifiant.
   */
  async findOnePourUtilisateur(
    id: string,
    utilisateur: { id: string; role: Role },
  ): Promise<DemandeService> {
    const demande = await this.findOne(id);

    const estClient = demande.clientId === utilisateur.id;
    const estFournisseur = demande.service?.etudiantId === utilisateur.id;

    if (!estClient && !estFournisseur && utilisateur.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Vous n'avez pas acces a cette demande de service",
      );
    }

    return demande;
  }

  async findByClient(clientId: string): Promise<DemandeService[]> {
    return this.repo.find({
      where: { clientId },
      relations: ['service', 'service.etudiant', 'service.etudiant.utilisateur'],
      order: { dateCreation: 'DESC' },
    });
  }

  /**
   * Demandes recues sur l'ensemble des services d'un etudiant.
   */
  async findByEtudiant(etudiantId: string): Promise<DemandeService[]> {
    return this.repo
      .createQueryBuilder('demande')
      .innerJoinAndSelect('demande.service', 'service')
      .leftJoinAndSelect('demande.client', 'client')
      .where('service.etudiantId = :etudiantId', { etudiantId })
      .orderBy('demande.dateCreation', 'DESC')
      .getMany();
  }

  /**
   * RGds3 : l'acceptation genere automatiquement une mission privee
   * (non listee publiquement) accompagnee d'une candidature deja
   * acceptee, afin de reutiliser tout le cycle existant : messagerie,
   * depot de livraison, paiement.
   */
  async accepter(id: string, etudiantId: string): Promise<DemandeService> {
    const demande = await this.findOne(id);

    if (demande.service.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez traiter que les demandes recues sur vos propres services',
      );
    }
    if (demande.statut !== StatutDemandeService.EN_ATTENTE) {
      throw new BadRequestException('Cette demande a deja ete traitee');
    }

    const mission = await this.missionsService.creerDepuisDemandeService({
      clientId: demande.clientId,
      titre: demande.service.titre,
      description: demande.cahierDesCharges,
      budget: Number(demande.budgetPropose),
      delaiJours: demande.delaiSouhaite,
      categorie: demande.service.categorie,
      competencesRequises: demande.service.competences,
    });

    await this.candidaturesService.creerAccepteeDirectement({
      missionId: mission.id,
      etudiantId,
      prixPropose: Number(demande.budgetPropose),
      delaiPropose: demande.delaiSouhaite,
      message: 'Demande de service acceptée directement.',
    });

    demande.statut = StatutDemandeService.ACCEPTEE;
    demande.missionId = mission.id;
    const saved = await this.repo.save(demande);

    await this.notificationsService.creer({
      destinataireId: demande.clientId,
      type: TypeNotification.CANDIDATURE_ACCEPTEE,
      titre: 'Demande de service acceptée',
      message: `Votre demande pour "${demande.service.titre}" a été acceptée. Vous pouvez suivre le projet dans "Mes missions".`,
      lienUrl: '/tableau-de-bord/mes-missions',
    });

    return saved;
  }

  async refuser(id: string, etudiantId: string): Promise<DemandeService> {
    const demande = await this.findOne(id);

    if (demande.service.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez traiter que les demandes recues sur vos propres services',
      );
    }
    if (demande.statut !== StatutDemandeService.EN_ATTENTE) {
      throw new BadRequestException('Cette demande a deja ete traitee');
    }

    demande.statut = StatutDemandeService.REFUSEE;
    const saved = await this.repo.save(demande);

    await this.notificationsService.creer({
      destinataireId: demande.clientId,
      type: TypeNotification.CANDIDATURE_REFUSEE,
      titre: 'Demande de service refusée',
      message: `Votre demande pour "${demande.service.titre}" a été refusée.`,
      lienUrl: '/tableau-de-bord/demandes-service',
    });

    return saved;
  }
}

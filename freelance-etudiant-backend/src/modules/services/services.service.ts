import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOffert } from './entities/service.entity';
import { DemandeService } from '../demandes-service/entities/demande-service.entity';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { FiltrerServicesDto } from './dto/filtrer-services.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceOffert)
    private readonly repo: Repository<ServiceOffert>,
    @InjectRepository(DemandeService)
    private readonly demandesRepo: Repository<DemandeService>,
  ) {}

  async create(etudiantId: string, dto: CreateServiceDto): Promise<ServiceOffert> {
    const service = this.repo.create({
      ...dto,
      etudiantId,
      competences: dto.competences ?? [],
      imagesUrls: dto.imagesUrls ?? [],
    });
    return this.repo.save(service);
  }

  /**
   * Recherche & Filtres (5.2 du cahier des charges) : mots-cles, categorie,
   * competences, tranche de prix.
   * RG10 : seuls les services disponibles (et moderes) sont retournes.
   */
  async findAll(filtres: FiltrerServicesDto): Promise<ServiceOffert[]> {
    const query = this.repo
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.etudiant', 'etudiant')
      .leftJoinAndSelect('etudiant.utilisateur', 'utilisateur')
      .where('service.disponible = true')
      // Les services archives par leur proprietaire quittent le catalogue
      // public (et n'acceptent plus de commande).
      .andWhere('service.estArchive = false')
      .andWhere('service.estModere = true');

    if (filtres.motsCles) {
      query.andWhere(
        '(service.titre ILIKE :motsCles OR service.description ILIKE :motsCles)',
        { motsCles: `%${filtres.motsCles}%` },
      );
    }
    if (filtres.categorie) {
      query.andWhere('service.categorie = :categorie', {
        categorie: filtres.categorie,
      });
    }
    if (filtres.competence) {
      query.andWhere(':competence = ANY(service.competences)', {
        competence: filtres.competence,
      });
    }
    if (filtres.prixMin !== undefined) {
      query.andWhere('service.prix >= :prixMin', { prixMin: filtres.prixMin });
    }
    if (filtres.prixMax !== undefined) {
      query.andWhere('service.prix <= :prixMax', { prixMax: filtres.prixMax });
    }
    return query.orderBy('service.dateCreation', 'DESC').getMany();
  }

  async findOne(id: string): Promise<ServiceOffert> {
    const service = await this.repo.findOne({
      where: { id },
      relations: ['etudiant', 'etudiant.utilisateur'],
    });
    if (!service) {
      throw new NotFoundException('Service introuvable');
    }
    return service;
  }

  async findByEtudiant(etudiantId: string): Promise<ServiceOffert[]> {
    return this.repo.find({
      where: { etudiantId },
      order: { dateCreation: 'DESC' },
    });
  }

  async update(
    id: string,
    etudiantId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceOffert> {
    const service = await this.findOne(id);
    if (service.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres services',
      );
    }
    Object.assign(service, dto);
    return this.repo.save(service);
  }

  /**
   * Archive un service (suppression logique reversible).
   *
   * Permission : seul le proprietaire du service peut l'archiver (verifie
   * cote backend sur le service reellement stocke — jamais sur un
   * identifiant envoye par le frontend).
   *
   * Effets : le service disparait du catalogue public (findAll filtre
   * estArchive) et n'accepte plus de commande (DemandesServiceService.creer
   * refuse un service non disponible). L'historique des demandes est
   * conserve.
   */
  async archiver(id: string, etudiantId: string): Promise<ServiceOffert> {
    const service = await this.findOne(id);
    if (service.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez archiver que vos propres services',
      );
    }
    service.estArchive = true;
    service.disponible = false;
    return this.repo.save(service);
  }

  /**
   * Restaure un service archive : il redevient editable ; la
   * disponibilite publique reste desactivee (au proprietaire de la
   * republier via la bascule existante).
   */
  async restaurer(id: string, etudiantId: string): Promise<ServiceOffert> {
    const service = await this.findOne(id);
    if (service.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez restaurer que vos propres services',
      );
    }
    service.estArchive = false;
    return this.repo.save(service);
  }

  /**
   * Suppression d'un service par son proprietaire.
   *
   * Protection des donnees historiques : demandes_service.service_id est
   * en CASCADE — supprimer physiquement un service detruirait toutes les
   * demandes de service associees (commandes, cahiers des charges,
   * missions privees rattachees). Tant qu'AU MOINS une demande existe
   * (quel que soit son statut), la suppression physique est refusee au
   * profit de l'archivage. Un service jamais commande peut etre supprime
   * definitivement sans casser aucune donnee.
   */
  async remove(id: string, etudiantId: string): Promise<void> {
    const service = await this.findOne(id);
    if (service.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres services',
      );
    }

    const nombreDemandes = await this.demandesRepo.count({
      where: { serviceId: id },
    });
    if (nombreDemandes > 0) {
      throw new ConflictException(
        'Ce service est lié à des commandes : il ne peut pas être supprimé définitivement. Archivez-le plutôt.',
      );
    }

    await this.repo.remove(service);
  }

  /**
   * Moderation admin (2.3 Moderation du contenu).
   */
  async setModeration(id: string, estModere: boolean): Promise<ServiceOffert> {
    const service = await this.findOne(id);
    service.estModere = estModere;
    return this.repo.save(service);
  }
}

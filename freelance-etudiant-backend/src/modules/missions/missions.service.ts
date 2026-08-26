import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission } from './entities/mission.entity';
import { CreateMissionDto, UpdateMissionDto } from './dto/mission.dto';
import { FiltrerMissionsDto } from './dto/filtrer-missions.dto';
import { StatutMission } from '../../common/enums/statut-mission.enum';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private readonly repo: Repository<Mission>,
  ) {}

  async create(clientId: string, dto: CreateMissionDto): Promise<Mission> {
    const dateLimite = new Date(dto.dateLimite);
    if (dateLimite <= new Date()) {
      throw new BadRequestException(
        'La date limite doit etre posterieure a la date de creation',
      );
    }
    const mission = this.repo.create({
      ...dto,
      dateLimite,
      clientId,
      competencesRequises: dto.competencesRequises ?? [],
      statut: StatutMission.OUVERTE,
    });
    return this.repo.save(mission);
  }

  async findAll(filtres: FiltrerMissionsDto): Promise<Mission[]> {
    const query = this.repo
      .createQueryBuilder('mission')
      .leftJoinAndSelect('mission.client', 'client')
      .leftJoinAndSelect('client.utilisateur', 'utilisateur')
      .where('mission.estModere = true')
      .andWhere('mission.statut = :statut', { statut: StatutMission.OUVERTE });

    if (filtres.motsCles) {
      query.andWhere(
        '(mission.titre ILIKE :motsCles OR mission.description ILIKE :motsCles)',
        { motsCles: `%${filtres.motsCles}%` },
      );
    }
    if (filtres.categorie) {
      query.andWhere('mission.categorie = :categorie', {
        categorie: filtres.categorie,
      });
    }
    if (filtres.competence) {
      query.andWhere(':competence = ANY(mission.competencesRequises)', {
        competence: filtres.competence,
      });
    }
    if (filtres.budgetMin !== undefined) {
      query.andWhere('mission.budget >= :budgetMin', {
        budgetMin: filtres.budgetMin,
      });
    }
    if (filtres.budgetMax !== undefined) {
      query.andWhere('mission.budget <= :budgetMax', {
        budgetMax: filtres.budgetMax,
      });
    }
    return query.orderBy('mission.dateCreation', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Mission> {
    const mission = await this.repo.findOne({
      where: { id },
      relations: ['client', 'client.utilisateur', 'candidatures'],
    });
    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }
    return mission;
  }

  async findByClient(clientId: string): Promise<Mission[]> {
    return this.repo.find({
      where: { clientId },
      relations: ['candidatures'],
      order: { dateCreation: 'DESC' },
    });
  }

  async update(
    id: string,
    clientId: string,
    dto: UpdateMissionDto,
  ): Promise<Mission> {
    const mission = await this.findOne(id);
    if (mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres missions',
      );
    }
    Object.assign(mission, {
      ...dto,
      dateLimite: dto.dateLimite ? new Date(dto.dateLimite) : mission.dateLimite,
    });
    return this.repo.save(mission);
  }

  async remove(id: string, clientId: string): Promise<void> {
    const mission = await this.findOne(id);
    if (mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres missions',
      );
    }
    await this.repo.remove(mission);
  }

  async setModeration(id: string, estModere: boolean): Promise<Mission> {
    const mission = await this.findOne(id);
    mission.estModere = estModere;
    return this.repo.save(mission);
  }

  async setStatut(id: string, statut: StatutMission): Promise<Mission> {
    const mission = await this.findOne(id);
    mission.statut = statut;
    return this.repo.save(mission);
  }

  /**
   * Cree une mission "privee" issue de l'acceptation d'une demande de
   * service (RGds3) : le client a commande directement un service publie
   * par un etudiant, avec un cahier des charges. Cette mission n'est pas
   * moderee/publique (elle ne doit pas apparaitre dans le panneau
   * d'affichage ni recevoir d'autres candidatures) ; elle sert uniquement
   * de support au cycle existant (livraison, paiement, messagerie).
   */
  async creerDepuisDemandeService(params: {
    clientId: string;
    titre: string;
    description: string;
    budget: number;
    delaiJours: number;
    categorie: string;
    competencesRequises: string[];
  }): Promise<Mission> {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + Math.max(1, params.delaiJours));

    const mission = this.repo.create({
      titre: params.titre,
      description: params.description,
      budget: params.budget,
      dateLimite,
      categorie: params.categorie,
      competencesRequises: params.competencesRequises,
      clientId: params.clientId,
      statut: StatutMission.EN_COURS,
      estModere: false,
    });
    return this.repo.save(mission);
  }

  /**
   * RG3 : une mission ne peut plus recevoir de candidature apres sa date
   * limite. Utilise par CandidaturesService avant creation d'une candidature.
   */
  assertMissionOuverteAuxCandidatures(mission: Mission): void {
    if (mission.statut !== StatutMission.OUVERTE) {
      throw new BadRequestException(
        "Cette mission n'accepte plus de nouvelles candidatures",
      );
    }
    if (new Date(mission.dateLimite) < new Date()) {
      throw new BadRequestException(
        'La date limite de candidature pour cette mission est depassee',
      );
    }
  }
}

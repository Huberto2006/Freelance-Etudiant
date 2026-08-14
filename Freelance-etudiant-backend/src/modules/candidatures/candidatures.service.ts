import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidature } from './entities/candidature.entity';
import { CreateCandidatureDto } from './dto/create-candidature.dto';
import { StatutCandidature } from '../../common/enums/statut-candidature.enum';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { MissionsService } from '../missions/missions.service';

@Injectable()
export class CandidaturesService {
  constructor(
    @InjectRepository(Candidature)
    private readonly repo: Repository<Candidature>,
    private readonly missionsService: MissionsService,
  ) {}

  /**
   * RG2 : un etudiant ne peut envoyer qu'une seule candidature par mission
   *       (verifie ici et garanti par la contrainte d'unicite en base).
   * RG3 : une mission fermee ou dont la date limite est depassee refuse
   *       toute nouvelle candidature (delegue a MissionsService).
   */
  async create(
    missionId: string,
    etudiantId: string,
    dto: CreateCandidatureDto,
  ): Promise<Candidature> {
    const mission = await this.missionsService.findOne(missionId);
    this.missionsService.assertMissionOuverteAuxCandidatures(mission);

    const dejaCandidat = await this.repo.findOne({
      where: { missionId, etudiantId },
    });
    if (dejaCandidat) {
      throw new ConflictException('Vous avez deja postule a cette mission');
    }

    const candidature = this.repo.create({
      ...dto,
      missionId,
      etudiantId,
      statut: StatutCandidature.EN_ATTENTE,
    });
    return this.repo.save(candidature);
  }

  async findByMission(missionId: string, clientId: string): Promise<Candidature[]> {
    const mission = await this.missionsService.findOne(missionId);
    if (mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que les candidatures de vos propres missions',
      );
    }
    return this.repo.find({
      where: { missionId },
      relations: ['etudiant', 'etudiant.utilisateur'],
      order: { dateCandidature: 'DESC' },
    });
  }

  async findByEtudiant(etudiantId: string): Promise<Candidature[]> {
    return this.repo.find({
      where: { etudiantId },
      relations: ['mission'],
      order: { dateCandidature: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Candidature> {
    const candidature = await this.repo.findOne({
      where: { id },
      relations: ['mission', 'mission.client', 'etudiant', 'etudiant.utilisateur'],
    });
    if (!candidature) {
      throw new NotFoundException('Candidature introuvable');
    }
    return candidature;
  }

  /**
   * Le client accepte une candidature : la candidature passe a "acceptee",
   * les autres candidatures de la meme mission sont automatiquement
   * refusees, et la mission passe en statut "en_cours".
   */
  async accepter(id: string, clientId: string): Promise<Candidature> {
    const candidature = await this.findOne(id);
    if (candidature.mission.clientId !== clientId) {
      throw new ForbiddenException(
        "Vous ne pouvez traiter que les candidatures de vos propres missions",
      );
    }
    if (candidature.statut !== StatutCandidature.EN_ATTENTE) {
      throw new BadRequestException('Cette candidature a deja ete traitee');
    }

    candidature.statut = StatutCandidature.ACCEPTEE;
    await this.repo.save(candidature);

    await this.repo
      .createQueryBuilder()
      .update(Candidature)
      .set({ statut: StatutCandidature.REFUSEE })
      .where('missionId = :missionId AND id != :id', {
        missionId: candidature.missionId,
        id: candidature.id,
      })
      .andWhere('statut = :statut', { statut: StatutCandidature.EN_ATTENTE })
      .execute();

    await this.missionsService.setStatut(candidature.missionId, StatutMission.EN_COURS);

    return candidature;
  }

  async refuser(id: string, clientId: string): Promise<Candidature> {
    const candidature = await this.findOne(id);
    if (candidature.mission.clientId !== clientId) {
      throw new ForbiddenException(
        "Vous ne pouvez traiter que les candidatures de vos propres missions",
      );
    }
    if (candidature.statut !== StatutCandidature.EN_ATTENTE) {
      throw new BadRequestException('Cette candidature a deja ete traitee');
    }
    candidature.statut = StatutCandidature.REFUSEE;
    return this.repo.save(candidature);
  }

  /**
   * RG8 : un etudiant ne peut livrer un projet que pour une mission dont sa
   * candidature a ete acceptee. Utilise par LivraisonsService.
   */
  assertCandidatureAcceptee(candidature: Candidature): void {
    if (candidature.statut !== StatutCandidature.ACCEPTEE) {
      throw new BadRequestException(
        'Seule une candidature acceptee autorise le depot d\'une livraison',
      );
    }
  }
}

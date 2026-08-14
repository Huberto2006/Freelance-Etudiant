import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signalement } from './entities/signalement.entity';
import { CreateSignalementDto, TraiterSignalementDto } from './dto/signalement.dto';
import { StatutSignalement } from '../../common/enums/statut-signalement.enum';

@Injectable()
export class SignalementsService {
  constructor(
    @InjectRepository(Signalement)
    private readonly repo: Repository<Signalement>,
  ) {}

  async create(
    signaleParId: string,
    dto: CreateSignalementDto,
  ): Promise<Signalement> {
    const signalement = this.repo.create({
      ...dto,
      signaleParId,
      statut: StatutSignalement.OUVERT,
    });
    return this.repo.save(signalement);
  }

  async findAll(statut?: StatutSignalement): Promise<Signalement[]> {
    return this.repo.find({
      where: statut ? { statut } : {},
      relations: ['signalePar', 'traitePar'],
      order: { dateSignalement: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Signalement> {
    const signalement = await this.repo.findOne({
      where: { id },
      relations: ['signalePar', 'traitePar'],
    });
    if (!signalement) {
      throw new NotFoundException('Signalement introuvable');
    }
    return signalement;
  }

  /**
   * RG11 : un signalement doit etre traite par un administrateur avant
   * cloture. Seul un admin a acces a cette action (verifie par le
   * RolesGuard au niveau du controleur).
   */
  async traiter(
    id: string,
    adminId: string,
    dto: TraiterSignalementDto,
  ): Promise<Signalement> {
    const signalement = await this.findOne(id);
    if (signalement.statut === StatutSignalement.TRAITE) {
      throw new BadRequestException('Ce signalement a deja ete traite');
    }
    signalement.statut = StatutSignalement.TRAITE;
    signalement.traiteParId = adminId;
    signalement.resolution = dto.resolution;
    signalement.dateTraitement = new Date();
    return this.repo.save(signalement);
  }
}

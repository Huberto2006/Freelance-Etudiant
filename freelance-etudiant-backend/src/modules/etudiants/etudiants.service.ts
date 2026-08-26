import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtudiantProfile } from './entities/etudiant-profile.entity';
import { UpdateEtudiantProfileDto } from './dto/update-etudiant-profile.dto';

@Injectable()
export class EtudiantsService {
  constructor(
    @InjectRepository(EtudiantProfile)
    private readonly repo: Repository<EtudiantProfile>,
  ) {}

  async findByUtilisateurId(utilisateurId: string): Promise<EtudiantProfile> {
    const profil = await this.repo.findOne({
      where: { utilisateurId },
      relations: ['utilisateur'],
    });
    if (!profil) {
      throw new NotFoundException('Profil etudiant introuvable');
    }
    return profil;
  }

  async findAll(competence?: string): Promise<EtudiantProfile[]> {
    const query = this.repo
      .createQueryBuilder('etudiant')
      .leftJoinAndSelect('etudiant.utilisateur', 'utilisateur')
      .where('utilisateur.estActif = true')
      .andWhere('utilisateur.estSuspendu = false');

    if (competence) {
      query.andWhere(':competence = ANY(etudiant.competences)', { competence });
    }
    return query.orderBy('etudiant.scoreReputation', 'DESC').getMany();
  }

  async update(
    utilisateurId: string,
    dto: UpdateEtudiantProfileDto,
  ): Promise<EtudiantProfile> {
    const profil = await this.findByUtilisateurId(utilisateurId);
    Object.assign(profil, dto);
    return this.repo.save(profil);
  }
}

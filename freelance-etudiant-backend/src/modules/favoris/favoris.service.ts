import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favori } from './entities/favori.entity';
import { TypeCibleFavori } from '../../common/enums/type-cible-favori.enum';

@Injectable()
export class FavorisService {
  constructor(
    @InjectRepository(Favori)
    private readonly repo: Repository<Favori>,
  ) {}

  async toggle(
    utilisateurId: string,
    cibleType: TypeCibleFavori,
    cibleId: string,
  ): Promise<{ enFavori: boolean }> {
    const existant = await this.repo.findOne({
      where: { utilisateurId, cibleType, cibleId },
    });
    if (existant) {
      await this.repo.remove(existant);
      return { enFavori: false };
    }
    await this.repo.save(this.repo.create({ utilisateurId, cibleType, cibleId }));
    return { enFavori: true };
  }

  async findByUser(utilisateurId: string, cibleType?: TypeCibleFavori): Promise<Favori[]> {
    return this.repo.find({
      where: cibleType ? { utilisateurId, cibleType } : { utilisateurId },
      order: { dateAjout: 'DESC' },
    });
  }

  async estEnFavori(
    utilisateurId: string,
    cibleType: TypeCibleFavori,
    cibleId: string,
  ): Promise<boolean> {
    const existant = await this.repo.findOne({
      where: { utilisateurId, cibleType, cibleId },
    });
    return Boolean(existant);
  }
}

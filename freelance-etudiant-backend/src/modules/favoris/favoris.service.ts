import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favori } from './entities/favori.entity';
import { TypeCibleFavori } from '../../common/enums/type-cible-favori.enum';
import { VerificationCibleService } from '../../common/services/verification-cible.service';

@Injectable()
export class FavorisService {
  constructor(
    @InjectRepository(Favori)
    private readonly repo: Repository<Favori>,
    private readonly verificationCibleService: VerificationCibleService,
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
      // RG-068 (REMOVE) : le retrait d'un favori reste TOUJOURS possible,
      // meme si la cible a disparu entre-temps, afin de ne jamais pieger
      // d'enregistrement orphelin dans la base.
      await this.repo.remove(existant);
      return { enFavori: false };
    }
    // RG-068 (CREATE) : verifier AVANT ecriture que la cible (mission,
    // service ou etudiant) existe reellement et que le type est autorise.
    await this.verificationCibleService.assertCibleExistante(cibleType, cibleId);
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

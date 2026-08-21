import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProfile } from './entities/client-profile.entity';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { TypeClient } from '../../common/enums/type-client.enum';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientProfile)
    private readonly repo: Repository<ClientProfile>,
  ) {}

  async findByUtilisateurId(utilisateurId: string): Promise<ClientProfile> {
    const profil = await this.repo.findOne({
      where: { utilisateurId },
      relations: ['utilisateur'],
    });
    if (!profil) {
      throw new NotFoundException('Profil client introuvable');
    }
    return profil;
  }

  async update(
    utilisateurId: string,
    dto: UpdateClientProfileDto,
  ): Promise<ClientProfile> {
    const profil = await this.findByUtilisateurId(utilisateurId);
    if (dto.typeClient) {
      profil.typeClient = dto.typeClient;
    }
    // Coherence avec le dictionnaire des donnees : nomEntreprise nul si particulier.
    if (profil.typeClient === TypeClient.PARTICULIER) {
      profil.nomEntreprise = undefined;
    } else if (dto.nomEntreprise !== undefined) {
      profil.nomEntreprise = dto.nomEntreprise;
    }
    return this.repo.save(profil);
  }
}

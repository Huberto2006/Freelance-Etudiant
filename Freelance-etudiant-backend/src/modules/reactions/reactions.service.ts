import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReactionProfil } from './entities/reaction-profil.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { Role } from '../../common/enums/role.enum';

export interface ReactionInfo {
  total: number;
  jaiReagi: boolean;
}

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(ReactionProfil)
    private readonly repo: Repository<ReactionProfil>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Bascule la reaction de `auteurId` sur le profil `cibleId` :
   * l'ajoute si elle n'existe pas encore, la retire sinon.
   */
  async toggle(auteurId: string, cibleId: string): Promise<ReactionInfo> {
    if (auteurId === cibleId) {
      throw new BadRequestException('Vous ne pouvez pas reagir a votre propre profil');
    }

    const cible = await this.usersService.findById(cibleId);
    if (!cible) {
      throw new NotFoundException('Profil introuvable');
    }

    const existante = await this.repo.findOne({ where: { auteurId, cibleId } });
    if (existante) {
      await this.repo.remove(existante);
    } else {
      await this.repo.save(this.repo.create({ auteurId, cibleId }));
      await this.notificationsService.creer({
        destinataireId: cibleId,
        type: TypeNotification.NOUVELLE_REACTION,
        titre: 'Nouvelle réaction sur votre profil',
        message: 'Quelqu\u2019un a réagi à votre profil.',
        lienUrl:
          cible.role === Role.ETUDIANT ? `/etudiants/${cibleId}` : `/clients/${cibleId}`,
      });
    }

    return this.getInfo(cibleId, auteurId);
  }

  async getInfo(cibleId: string, auteurId?: string): Promise<ReactionInfo> {
    const total = await this.repo.count({ where: { cibleId } });
    const jaiReagi = auteurId
      ? Boolean(await this.repo.findOne({ where: { auteurId, cibleId } }))
      : false;
    return { total, jaiReagi };
  }
}

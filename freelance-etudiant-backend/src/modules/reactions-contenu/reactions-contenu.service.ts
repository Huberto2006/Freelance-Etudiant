import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReactionContenu, TypeReactionContenu } from './entities/reaction-contenu.entity';
import { ReagirDto } from './dto/reagir.dto';
import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';
import { MissionsService } from '../missions/missions.service';
import { ServicesService } from '../services/services.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

export interface InfoReactionsContenu {
  jaime: number;
  jenaimepas: number;
  maReaction: TypeReactionContenu | null;
}

@Injectable()
export class ReactionsContenuService {
  constructor(
    @InjectRepository(ReactionContenu)
    private readonly repo: Repository<ReactionContenu>,
    private readonly missionsService: MissionsService,
    private readonly servicesService: ServicesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async resoudreProprietaire(
    cibleType: TypeCibleContenu,
    cibleId: string,
  ): Promise<{ proprietaireId: string; titre: string }> {
    if (cibleType === TypeCibleContenu.MISSION) {
      const mission = await this.missionsService.findOne(cibleId);
      return { proprietaireId: mission.clientId, titre: mission.titre };
    }
    const service = await this.servicesService.findOne(cibleId);
    return { proprietaireId: service.etudiantId, titre: service.titre };
  }

  /**
   * RGr1/RGr2 : bascule la reaction de l'utilisateur sur un contenu.
   * - Aucune reaction existante -> on la cree (et on notifie le
   *   proprietaire, comme le fait deja le module reactions de profil).
   * - Reaction existante du meme type -> on la retire (toggle off), pas
   *   de notification (evite le spam sur retrait/changement d'avis).
   * - Reaction existante d'un type different -> on la change (👍 <-> 👎),
   *   pas de nouvelle notification non plus.
   */
  async reagir(auteurId: string, dto: ReagirDto): Promise<InfoReactionsContenu> {
    const existante = await this.repo.findOne({
      where: { auteurId, cibleType: dto.cibleType, cibleId: dto.cibleId },
    });

    if (!existante) {
      await this.repo.save(
        this.repo.create({
          auteurId,
          cibleType: dto.cibleType,
          cibleId: dto.cibleId,
          type: dto.type,
        }),
      );

      const { proprietaireId, titre } = await this.resoudreProprietaire(
        dto.cibleType,
        dto.cibleId,
      );
      if (proprietaireId !== auteurId) {
        const chemin = dto.cibleType === TypeCibleContenu.MISSION ? 'missions' : 'services';
        await this.notificationsService.creer({
          destinataireId: proprietaireId,
          type: TypeNotification.NOUVELLE_REACTION,
          titre: 'Nouvelle réaction',
          message: `Quelqu'un a réagi à "${titre}".`,
          lienUrl: `/${chemin}/${dto.cibleId}`,
        });
      }
    } else if (existante.type === dto.type) {
      await this.repo.remove(existante);
    } else {
      existante.type = dto.type;
      await this.repo.save(existante);
    }

    return this.getInfo(dto.cibleType, dto.cibleId, auteurId);
  }

  async getInfo(
    cibleType: TypeCibleContenu,
    cibleId: string,
    auteurId?: string,
  ): Promise<InfoReactionsContenu> {
    const [jaime, jenaimepas, maReactionEntite] = await Promise.all([
      this.repo.count({
        where: { cibleType, cibleId, type: TypeReactionContenu.JAIME },
      }),
      this.repo.count({
        where: { cibleType, cibleId, type: TypeReactionContenu.JENAIMEPAS },
      }),
      auteurId
        ? this.repo.findOne({ where: { cibleType, cibleId, auteurId } })
        : Promise.resolve(null),
    ]);

    return {
      jaime,
      jenaimepas,
      maReaction: maReactionEntite?.type ?? null,
    };
  }
}

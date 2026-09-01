import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commentaire } from './entities/commentaire.entity';
import { CreerCommentaireDto, ModifierCommentaireDto } from './dto/commentaire.dto';
import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';
import { MissionsService } from '../missions/missions.service';
import { ServicesService } from '../services/services.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

@Injectable()
export class CommentairesService {
  constructor(
    @InjectRepository(Commentaire)
    private readonly repo: Repository<Commentaire>,
    private readonly missionsService: MissionsService,
    private readonly servicesService: ServicesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Resout le proprietaire (destinataire de notification) d'une mission
   * ou d'un service, sans dupliquer la logique deja presente dans
   * MissionsService/ServicesService.
   */
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

  async creer(auteurId: string, dto: CreerCommentaireDto): Promise<Commentaire> {
    const commentaire = this.repo.create({
      contenu: dto.contenu.trim(),
      cibleType: dto.cibleType,
      cibleId: dto.cibleId,
      auteurId,
    });
    const saved = await this.repo.save(commentaire);

    // Notification au proprietaire du contenu (sauf s'il commente lui-meme).
    const { proprietaireId, titre } = await this.resoudreProprietaire(
      dto.cibleType,
      dto.cibleId,
    );
    if (proprietaireId !== auteurId) {
      const chemin = dto.cibleType === TypeCibleContenu.MISSION ? 'missions' : 'services';
      await this.notificationsService.creer({
        destinataireId: proprietaireId,
        type: TypeNotification.NOUVEAU_COMMENTAIRE,
        titre: 'Nouveau commentaire',
        message: `Un nouveau commentaire a été ajouté sur "${titre}".`,
        lienUrl: `/${chemin}/${dto.cibleId}`,
      });
    }

    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<Commentaire> {
    const commentaire = await this.repo.findOne({
      where: { id },
      relations: ['auteur'],
    });
    if (!commentaire) {
      throw new NotFoundException('Commentaire introuvable');
    }
    return commentaire;
  }

  async findByCible(
    cibleType: TypeCibleContenu,
    cibleId: string,
  ): Promise<Commentaire[]> {
    return this.repo.find({
      where: { cibleType, cibleId },
      relations: ['auteur'],
      order: { dateCreation: 'ASC' },
    });
  }

  /**
   * RGc1 : seul l'auteur peut modifier son propre commentaire.
   */
  async modifier(
    id: string,
    auteurId: string,
    dto: ModifierCommentaireDto,
  ): Promise<Commentaire> {
    const commentaire = await this.findOne(id);
    if (commentaire.auteurId !== auteurId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres commentaires',
      );
    }
    commentaire.contenu = dto.contenu.trim();
    await this.repo.save(commentaire);
    return this.findOne(id);
  }

  /**
   * RGc2 : seul l'auteur (ou un administrateur, pour la moderation) peut
   * supprimer un commentaire.
   */
  async supprimer(id: string, utilisateurId: string, estAdmin: boolean): Promise<void> {
    const commentaire = await this.findOne(id);
    if (commentaire.auteurId !== utilisateurId && !estAdmin) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres commentaires',
      );
    }
    await this.repo.remove(commentaire);
  }
}

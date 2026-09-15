import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Groupe } from './entities/groupe.entity';
import { MembreGroupe } from './entities/membre-groupe.entity';
import { InvitationGroupe } from './entities/invitation-groupe.entity';
import { Mission } from '../missions/entities/mission.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { CreerGroupeDto } from './dto/creer-groupe.dto';
import { InviterEtudiantDto } from './dto/inviter-etudiant.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

enum StatutInvitationGroupe {
  EN_ATTENTE = 'en_attente',
  ACCEPTEE = 'acceptee',
  REFUSEE = 'refusee',
}

@Injectable()
export class GroupesService {
  constructor(
    @InjectRepository(Groupe)
    private readonly groupeRepository: Repository<Groupe>,

    @InjectRepository(MembreGroupe)
    private readonly membreRepository: Repository<MembreGroupe>,

    @InjectRepository(InvitationGroupe)
    private readonly invitationRepository: Repository<InvitationGroupe>,

    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,

    @InjectRepository(EtudiantProfile)
    private readonly etudiantRepository: Repository<EtudiantProfile>,

    private readonly dataSource: DataSource,

    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Créer un groupe.
   *
   * Le groupe peut :
   * - être créé sans mission ;
   * - être associé à une mission existante.
   *
   * Le créateur devient automatiquement chef du groupe.
   */
  async creer(
    dto: CreerGroupeDto,
    user: AuthenticatedUser,
  ): Promise<Groupe> {
    const nom = dto.nom?.trim();

    if (!nom) {
      throw new BadRequestException(
        'Le nom du groupe est obligatoire.',
      );
    }

    // Seuls les étudiants peuvent créer un groupe.
    if (user.role !== Role.ETUDIANT) {
      throw new ForbiddenException(
        'Seuls les étudiants peuvent créer un groupe.',
      );
    }

    // Vérifier que le profil étudiant existe.
    const etudiant = await this.etudiantRepository.findOne({
      where: {
        utilisateurId: user.id,
      },
    });

    if (!etudiant) {
      throw new NotFoundException(
        'Profil étudiant introuvable.',
      );
    }

    // Si une mission est fournie, vérifier qu'elle existe.
    let mission: Mission | null = null;

    if (dto.missionId) {
      mission = await this.missionRepository.findOne({
        where: {
          id: dto.missionId,
        },
      });

      if (!mission) {
        throw new NotFoundException(
          'Mission introuvable.',
        );
      }
    }

    // Transaction :
    // le groupe et son premier membre sont créés ensemble.
    return this.dataSource.transaction(async (manager) => {
      const groupe = manager.create(Groupe, {
        nom,
        description: dto.description?.trim() || null,
        createurId: etudiant.utilisateurId,
        missionId: mission?.id ?? null,
      });

      const groupeSauvegarde = await manager.save(Groupe, groupe);

      const membreCreateur = manager.create(MembreGroupe, {
        groupeId: groupeSauvegarde.id,
        etudiantId: etudiant.utilisateurId,
        role: 'chef',
      });

      await manager.save(MembreGroupe, membreCreateur);

      return groupeSauvegarde;
    });
  }

  /**
   * Récupérer les groupes de l'étudiant connecté.
   */
  async findMesGroupes(
    user: AuthenticatedUser,
  ): Promise<Groupe[]> {
    if (user.role !== Role.ETUDIANT) {
      throw new ForbiddenException(
        'Cette fonctionnalité est réservée aux étudiants.',
      );
    }

    return this.groupeRepository
      .createQueryBuilder('groupe')
      .innerJoin(
        MembreGroupe,
        'membre',
        'membre.groupe_id = groupe.id',
      )
      .where('membre.etudiant_id = :etudiantId', {
        etudiantId: user.id,
      })
      .orderBy('groupe.date_creation', 'DESC')
      .getMany();
  }

  /**
   * Récupérer un groupe avec ses membres.
   */
  async findOne(id: string): Promise<Groupe> {
    const groupe = await this.groupeRepository.findOne({
      where: { id },
      relations: [
        'membres',
        'membres.etudiant',
        'mission',
        'createur',
      ],
    });

    if (!groupe) {
      throw new NotFoundException(
        'Groupe introuvable.',
      );
    }

    return groupe;
  }

  /**
   * Trouver un groupe ou lever une erreur 404.
   *
   * Méthode de centralisation utilisée notamment par la messagerie de
   * groupe (MessagesService) : les règles de gestion du groupe restent
   * dans GroupesService.
   */
  async trouverGroupeOuErreur(groupeId: string): Promise<Groupe> {
    const groupe = await this.groupeRepository.findOne({
      where: { id: groupeId },
    });

    if (!groupe) {
      throw new NotFoundException(
        'Groupe introuvable.',
      );
    }

    return groupe;
  }

  /**
   * Vérifier que l'utilisateur est membre actif du groupe.
   *
   * L'adhésion est active tant que la ligne existe dans membres_groupes
   * (le départ d'un membre / le transfert de chef seront traités plus
   * tard ; ils supprimeront la ligne et révoqueront l'accès).
   *
   * Le chef et les membres sont soumis aux mêmes règles : le fait d'être
   * chef n'accorde aucun privilège supplémentaire ici.
   */
  async verifierMembreActif(
    groupeId: string,
    utilisateurId: string,
  ): Promise<MembreGroupe> {
    await this.trouverGroupeOuErreur(groupeId);

    const membre = await this.membreRepository.findOne({
      where: {
        groupeId,
        etudiantId: utilisateurId,
      },
    });

    if (!membre) {
      throw new ForbiddenException(
        "Vous n'êtes pas membre de ce groupe.",
      );
    }

    return membre;
  }

  /**
   * Lister les membres actuels d'un groupe.
   */
  async trouverMembres(groupeId: string): Promise<MembreGroupe[]> {
    return this.membreRepository.find({
      where: { groupeId },
    });
  }

  /**
   * Inviter un étudiant à rejoindre un groupe.
   *
   * Le chef est le seul autorisé à inviter.
   * Après création de l'invitation, une notification persistante
   * est envoyée à l'étudiant invité.
   */
  async inviter(
    groupeId: string,
    dto: InviterEtudiantDto,
    user: AuthenticatedUser,
  ): Promise<InvitationGroupe> {
    if (user.role !== Role.ETUDIANT) {
      throw new ForbiddenException(
        'Seuls les étudiants peuvent inviter des membres.',
      );
    }

    const groupe = await this.groupeRepository.findOne({
      where: { id: groupeId },
    });

    if (!groupe) {
      throw new NotFoundException(
        'Groupe introuvable.',
      );
    }

    const chef = await this.membreRepository.findOne({
      where: {
        groupeId,
        etudiantId: user.id,
        role: 'chef',
      },
    });

    if (!chef) {
      throw new ForbiddenException(
        'Seul le chef du groupe peut inviter un étudiant.',
      );
    }

    if (dto.etudiantId === user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous inviter vous-même.',
      );
    }

    const etudiant = await this.etudiantRepository.findOne({
      where: {
        utilisateurId: dto.etudiantId,
      },
    });

    if (!etudiant) {
      throw new NotFoundException(
        'Étudiant introuvable.',
      );
    }

    const membreExistant = await this.membreRepository.findOne({
      where: {
        groupeId,
        etudiantId: dto.etudiantId,
      },
    });

    if (membreExistant) {
      throw new BadRequestException(
        'Cet étudiant est déjà membre du groupe.',
      );
    }

    const invitationExistante =
      await this.invitationRepository.findOne({
        where: {
          groupeId,
          inviteId: dto.etudiantId,
        },
      });

    if (invitationExistante) {
      throw new BadRequestException(
        'Une invitation existe déjà pour cet étudiant.',
      );
    }

    const invitation = this.invitationRepository.create({
      groupeId,
      inviteurId: user.id,
      inviteId: dto.etudiantId,
      statut: StatutInvitationGroupe.EN_ATTENTE,
    });

    const sauvegarde =
      await this.invitationRepository.save(invitation);

    /*
     * Notification persistante :
     * l'étudiant invité reçoit la notification dans son centre
     * de notifications et via le temps réel.
     */
    await this.notificationsService.creer({
      destinataireId: dto.etudiantId,
      type: TypeNotification.NOUVELLE_INVITATION_GROUPE,
      titre: 'Invitation à rejoindre un groupe',
      message: `Vous avez été invité à rejoindre le groupe « ${groupe.nom} ».`,
      lienUrl: `/tableau-de-bord/groupes/${groupeId}`,
    });

    return sauvegarde;
  }

  /**
   * Accepter une invitation à rejoindre un groupe.
   */
  async accepterInvitation(
    invitationId: string,
    user: AuthenticatedUser,
  ): Promise<MembreGroupe> {
    if (user.role !== Role.ETUDIANT) {
      throw new ForbiddenException(
        'Seuls les étudiants peuvent accepter une invitation.',
      );
    }

    const invitation = await this.invitationRepository.findOne({
      where: {
        id: invitationId,
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Invitation introuvable.',
      );
    }

    if (invitation.inviteId !== user.id) {
      throw new ForbiddenException(
        'Cette invitation ne vous est pas destinée.',
      );
    }

    if (
      invitation.statut !==
      StatutInvitationGroupe.EN_ATTENTE
    ) {
      throw new BadRequestException(
        'Cette invitation a déjà été traitée.',
      );
    }

    const membreExistant = await this.membreRepository.findOne({
      where: {
        groupeId: invitation.groupeId,
        etudiantId: user.id,
      },
    });

    if (membreExistant) {
      throw new BadRequestException(
        'Vous êtes déjà membre de ce groupe.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const membre = manager.create(MembreGroupe, {
        groupeId: invitation.groupeId,
        etudiantId: user.id,
        role: 'membre',
      });

      const membreSauvegarde =
        await manager.save(MembreGroupe, membre);

      invitation.statut =
        StatutInvitationGroupe.ACCEPTEE;

      await manager.save(InvitationGroupe, invitation);

      return membreSauvegarde;
    });
  }

  /**
   * Refuser une invitation à rejoindre un groupe.
   */
  async refuserInvitation(
    invitationId: string,
    user: AuthenticatedUser,
  ): Promise<InvitationGroupe> {
    if (user.role !== Role.ETUDIANT) {
      throw new ForbiddenException(
        'Seuls les étudiants peuvent refuser une invitation.',
      );
    }

    const invitation = await this.invitationRepository.findOne({
      where: {
        id: invitationId,
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Invitation introuvable.',
      );
    }

    if (invitation.inviteId !== user.id) {
      throw new ForbiddenException(
        'Cette invitation ne vous est pas destinée.',
      );
    }

    if (
      invitation.statut !==
      StatutInvitationGroupe.EN_ATTENTE
    ) {
      throw new BadRequestException(
        'Cette invitation a déjà été traitée.',
      );
    }

    invitation.statut =
      StatutInvitationGroupe.REFUSEE;

    return this.invitationRepository.save(invitation);
  }
}

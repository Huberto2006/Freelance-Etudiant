import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { Amitie } from './entities/amitie.entity';
import { EnvoyerDemandeAmitieDto } from './dto/envoyer-demande-amitie.dto';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { UsersService } from '../users/users.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../../common/enums/role.enum';
import { StatutAmitie } from '../../common/enums/statut-amitie.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

/**
 * Presentation synthetique d'un profil etudiant dans les reponses API.
 * Un objet plat est construit explicitement : aucune entite Utilisateur
 * (mot de passe, jetons de verification...) n'est jamais renvoyee.
 */
export interface ProfilAmitie {
  id: string;
  nom: string | null;
  photoUrl: string | null;
  niveauEtude: string | null;
  universite: string | null;
  competences: string[];
}

export interface DemandeRecue {
  id: string;
  statut: StatutAmitie;
  dateCreation: Date;
  demandeur: ProfilAmitie | null;
}

export interface DemandeEnvoyee {
  id: string;
  statut: StatutAmitie;
  dateCreation: Date;
  receveur: ProfilAmitie | null;
}

export interface AmiItem {
  id: string;
  statut: StatutAmitie;
  dateCreation: Date;
  dateReponse: Date | null;
  ami: ProfilAmitie | null;
}

/**
 * Relation d'amitie entre deux etudiants.
 *
 * Indépendante des missions, candidatures et groupes. Les identifiants
 * manipules sont les identifiants utilisateurs (egal a la cle primaire
 * de profils_etudiants), comme dans les modules groupes et messages.
 */
@Injectable()
export class AmitieService {
  constructor(
    @InjectRepository(Amitie)
    private readonly amitieRepository: Repository<Amitie>,

    @InjectRepository(EtudiantProfile)
    private readonly etudiantRepository: Repository<EtudiantProfile>,

    private readonly usersService: UsersService,

    private readonly realtimeGateway: RealtimeGateway,

    private readonly notificationsService: NotificationsService,

    private readonly dataSource: DataSource,
  ) { }

  /**
   * ========================================================
   * ENVOI D'UNE DEMANDE D'AMITIÉ
   * ========================================================
   *
   * Regles :
   * - seuls les etudiants peuvent envoyer une demande ;
   * - impossible de s'envoyer une demande a soi-meme ;
   * - le destinataire doit etre un etudiant (ni client, ni admin) ;
   * - aucune relation active ne doit deja exister entre les deux
   *   etudiants, dans AUCUNE des deux directions (A->B ou B->A) ;
   * - une demande refusee n'occupe pas la paire : une nouvelle
   *   demande est autorisee.
   */
  async envoyerDemande(
    dto: EnvoyerDemandeAmitieDto,
    user: AuthenticatedUser,
  ): Promise<Amitie> {
    await this.verifierEtudiant(user);

    const destinataireId = dto.etudiantId;

    if (destinataireId === user.id) {
      throw new BadRequestException(
        "Vous ne pouvez pas vous envoyer une demande d'amitié à vous-même.",
      );
    }

    /*
     * Le destinataire doit être un étudiant : ni client, ni admin.
     */
    const destinataire = await this.usersService.findById(destinataireId);

    if (!destinataire) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    if (destinataire.role !== Role.ETUDIANT) {
      throw new BadRequestException(
        "Les demandes d'amitié ne peuvent être envoyées qu'à un autre étudiant.",
      );
    }

    const receveurProfil = await this.etudiantRepository.findOne({
      where: { utilisateurId: destinataireId },
    });

    if (!receveurProfil) {
      throw new NotFoundException('Profil étudiant introuvable.');
    }

    /*
     * Verification des DEUX directions : A->B ET B->A. Il ne doit jamais
     * exister deux relations paralleles entre les memes etudiants.
     */
    const existante = await this.trouverRelationEntre(user.id, destinataireId);

    if (existante) {
      if (existante.statut === StatutAmitie.EN_ATTENTE) {
        throw new ConflictException(
          "Une demande d'amitié existe déjà entre vous deux.",
        );
      }

      if (existante.statut === StatutAmitie.ACCEPTEE) {
        throw new ConflictException('Vous êtes déjà amis avec cet étudiant.');
      }

      /*
       * REFUSEE : la demande refusee reste en base comme historique mais
       * n'occupe pas la paire active (l'index unique partiel de la
       * migration ne couvre que les statuts actifs) : une nouvelle
       * demande est donc autorisee.
       */
    }

    const amitie = this.amitieRepository.create({
      demandeurId: user.id,
      receveurId: destinataireId,
      statut: StatutAmitie.EN_ATTENTE,
    });

    let sauvegarde: Amitie;

    try {
      sauvegarde = await this.amitieRepository.save(amitie);
    } catch (error) {
      /*
       * Filet de securite : deux demandes reciproques envoyees en meme
       * temps (A->B et B->A en concurrence). L'index unique partiel
       * uq_amities_paire_active tranche : le perdant recoit une erreur
       * 23505 (unique_violation) transformee en 409.
       */
      if (error instanceof QueryFailedError && this.estErreurUnique(error)) {
        throw new ConflictException(
          "Une demande d'amitié existe déjà entre vous deux.",
        );
      }

      throw error;
    }
    /*
     * Temps réel : prévenir le destinataire qu'une demande vient d'arriver.
     */
    this.realtimeGateway.emitToUser(destinataireId, 'amitie:demande:recue', {
      id: sauvegarde.id,
      statut: sauvegarde.statut,
      dateCreation: sauvegarde.dateCreation,
    });

    /*
     * Notification persistante : la demande apparaît également
     * dans le système standard de notifications.
     */
    await this.notificationsService.creer({
      destinataireId,
      type: TypeNotification.NOUVELLE_DEMANDE_AMITIE,
      titre: "Nouvelle demande d'amitié",
      message: 'Un étudiant vous a envoyé une demande d\'amitié.',
      lienUrl: '/tableau-de-bord/amis',
    });

    return sauvegarde;
  }

  /**
   * ========================================================
   * DEMANDES D'AMITIÉ REÇUES
   * ========================================================
   */
  async findDemandesRecues(user: AuthenticatedUser): Promise<DemandeRecue[]> {
    await this.verifierEtudiant(user);

    const demandes = await this.amitieRepository.find({
      where: {
        receveurId: user.id,
        statut: StatutAmitie.EN_ATTENTE,
      },
      relations: ['demandeur', 'demandeur.utilisateur'],
      order: { dateCreation: 'DESC' },
    });

    return demandes.map((demande) => ({
      id: demande.id,
      statut: demande.statut,
      dateCreation: demande.dateCreation,
      demandeur: this.mapperProfil(demande.demandeur),
    }));
  }

  /**
   * ========================================================
   * DEMANDES D'AMITIÉ ENVOYÉES
   * ========================================================
   */
  async findDemandesEnvoyees(
    user: AuthenticatedUser,
  ): Promise<DemandeEnvoyee[]> {
    await this.verifierEtudiant(user);

    const demandes = await this.amitieRepository.find({
      where: {
        demandeurId: user.id,
        statut: StatutAmitie.EN_ATTENTE,
      },
      relations: ['receveur', 'receveur.utilisateur'],
      order: { dateCreation: 'DESC' },
    });

    return demandes.map((demande) => ({
      id: demande.id,
      statut: demande.statut,
      dateCreation: demande.dateCreation,
      receveur: this.mapperProfil(demande.receveur),
    }));
  }

  /**
   * ========================================================
   * ACCEPTATION D'UNE DEMANDE
   * ========================================================
   *
   * Seul le receveur peut accepter. La demande doit exister et être
   * en attente. Apres acceptation : statut = acceptee,
   * date_reponse = maintenant.
   */
  async accepter(demandeId: string, user: AuthenticatedUser): Promise<Amitie> {
    await this.verifierEtudiant(user);

    const demande = await this.amitieRepository.findOne({
      where: { id: demandeId },
    });

    if (!demande) {
      throw new NotFoundException("Demande d'amitié introuvable.");
    }

    if (demande.receveurId !== user.id) {
      throw new ForbiddenException(
        "Cette demande d'amitié ne vous est pas destinée.",
      );
    }

    if (demande.statut !== StatutAmitie.EN_ATTENTE) {
      throw new BadRequestException(
        "Cette demande d'amitié a déjà été traitée.",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      demande.statut = StatutAmitie.ACCEPTEE;
      demande.dateReponse = new Date();

      const acceptee = await manager.save(Amitie, demande);

      /*
       * Temps reel : informer le demandeur que sa demande a ete acceptee.
       */
      this.realtimeGateway.emitToUser(
        demande.demandeurId,
        'amitie:demande:acceptee',
        {
          id: acceptee.id,
          statut: acceptee.statut,
          dateReponse: acceptee.dateReponse,
        },
      );

      return acceptee;
    });
  }

  /**
   * ========================================================
   * REFUS D'UNE DEMANDE
   * ========================================================
   *
   * Seul le receveur peut refuser. Une demande refusee n'est pas une
   * amitie (elle n'apparaitra jamais dans GET /amities) et n'occupe
   * pas la paire active : une nouvelle demande peut etre envoyee.
   */
  async refuser(demandeId: string, user: AuthenticatedUser): Promise<Amitie> {
    await this.verifierEtudiant(user);

    const demande = await this.amitieRepository.findOne({
      where: { id: demandeId },
    });

    if (!demande) {
      throw new NotFoundException("Demande d'amitié introuvable.");
    }

    if (demande.receveurId !== user.id) {
      throw new ForbiddenException(
        "Cette demande d'amitié ne vous est pas destinée.",
      );
    }

    if (demande.statut !== StatutAmitie.EN_ATTENTE) {
      throw new BadRequestException(
        "Cette demande d'amitié a déjà été traitée.",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      demande.statut = StatutAmitie.REFUSEE;
      demande.dateReponse = new Date();

      const refusee = await manager.save(Amitie, demande);

      /*
       * Temps reel : informer le demandeur que sa demande a ete refusee.
       */
      this.realtimeGateway.emitToUser(
        demande.demandeurId,
        'amitie:demande:refusee',
        {
          id: refusee.id,
          statut: refusee.statut,
          dateReponse: refusee.dateReponse,
        },
      );

      return refusee;
    });
  }

  /**
   * ========================================================
   * LISTE DES AMIS
   * ========================================================
   *
   * Uniquement les relations statut = acceptee, dans les DEUX
   * directions : A a demande a B, ou B a demande a A — dans les deux
   * cas A et B doivent apparaitre comme amis.
   */
  async findMesAmis(user: AuthenticatedUser): Promise<AmiItem[]> {
    await this.verifierEtudiant(user);

    const relations = await this.amitieRepository.find({
      where: [
        { demandeurId: user.id, statut: StatutAmitie.ACCEPTEE },
        { receveurId: user.id, statut: StatutAmitie.ACCEPTEE },
      ],
      relations: [
        'demandeur',
        'demandeur.utilisateur',
        'receveur',
        'receveur.utilisateur',
      ],
      order: { dateCreation: 'DESC' },
    });

    return relations.map((relation) => {
      const profilAmi =
        relation.demandeurId === user.id
          ? relation.receveur
          : relation.demandeur;

      return {
        id: relation.id,
        statut: relation.statut,
        dateCreation: relation.dateCreation,
        dateReponse: relation.dateReponse,
        ami: this.mapperProfil(profilAmi),
      };
    });
  }

  /**
   * ========================================================
   * VÉRIFICATION RÉUTILISABLE : SONT-ILS AMIS ?
   * ========================================================
   *
   * Methode prevue pour etre utilisee par MessagesModule lors d'une
   * prochaine etape : retourne true uniquement lorsqu'une relation
   * statut = acceptee existe entre les deux etudiants, dans l'un ou
   * l'autre sens.
   */
  async sontAmis(etudiantId1: string, etudiantId2: string): Promise<boolean> {
    if (!etudiantId1 || !etudiantId2 || etudiantId1 === etudiantId2) {
      return false;
    }

    const total = await this.amitieRepository.count({
      where: [
        {
          demandeurId: etudiantId1,
          receveurId: etudiantId2,
          statut: StatutAmitie.ACCEPTEE,
        },
        {
          demandeurId: etudiantId2,
          receveurId: etudiantId1,
          statut: StatutAmitie.ACCEPTEE,
        },
      ],
    });

    return total > 0;
  }

  /**
   * ========================================================
   * RETRAIT D'UN AMI
   * ========================================================
   *
   * Seule la relation d'amitie est supprimee : les messages, groupes,
   * candidatures et missions des deux etudiants ne sont jamais touches.
   */
  async retirer(etudiantAmiId: string, user: AuthenticatedUser): Promise<void> {
    await this.verifierEtudiant(user);

    if (etudiantAmiId === user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous retirer vous-même de vos amis.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const relation = await manager.findOne(Amitie, {
        where: [
          {
            demandeurId: user.id,
            receveurId: etudiantAmiId,
            statut: StatutAmitie.ACCEPTEE,
          },
          {
            demandeurId: etudiantAmiId,
            receveurId: user.id,
            statut: StatutAmitie.ACCEPTEE,
          },
        ],
      });

      if (!relation) {
        throw new NotFoundException('Aucune amitié avec cet étudiant.');
      }

      await manager.delete(Amitie, { id: relation.id });

      /*
       * Temps reel : informer l'ancien ami que la relation a ete rompue.
       */
      this.realtimeGateway.emitToUser(etudiantAmiId, 'amitie:supprimee', {
        id: relation.id,
        parUtilisateurId: user.id,
      });
    });
  }

  /**
   * L'utilisateur connecte doit etre un etudiant disposant d'un profil.
   * Les routes d'amitie sont strictement reservees aux etudiants.
   */
  private async verifierEtudiant(
    user: AuthenticatedUser,
  ): Promise<EtudiantProfile> {
    if (user.role !== Role.ETUDIANT) {
      throw new ForbiddenException(
        'Seuls les étudiants peuvent accéder aux amitiés.',
      );
    }

    const profil = await this.etudiantRepository.findOne({
      where: { utilisateurId: user.id },
    });

    if (!profil) {
      throw new NotFoundException('Profil étudiant introuvable.');
    }

    return profil;
  }

  /**
   * Recherche la relation existant entre deux etudiants, dans les deux
   * directions, la plus recente d'abord.
   */
  private trouverRelationEntre(
    etudiantId1: string,
    etudiantId2: string,
  ): Promise<Amitie | null> {
    return this.amitieRepository.findOne({
      where: [
        { demandeurId: etudiantId1, receveurId: etudiantId2 },
        { demandeurId: etudiantId2, receveurId: etudiantId1 },
      ],
      order: { dateCreation: 'DESC' },
    });
  }

  /**
   * Construit la presentation synthetique d'un profil etudiant (jamais
   * d'entite Utilisateur brute : mot de passe et jetons exclus).
   */
  private mapperProfil(profil?: EtudiantProfile | null): ProfilAmitie | null {
    if (!profil) {
      return null;
    }

    return {
      id: profil.utilisateurId,
      nom: profil.utilisateur?.nom ?? null,
      photoUrl: profil.utilisateur?.photoUrl ?? null,
      niveauEtude: profil.niveauEtude,
      universite: profil.universite,
      competences: profil.competences ?? [],
    };
  }

  /**
   * Detection d'une violation de contrainte unique PostgreSQL (23505),
   * remontee par le driver pg, pour transformer la course concurrente
   * de deux demandes reciproques en ConflictException (409).
   */
  private estErreurUnique(error: QueryFailedError): boolean {
    const driverError = error.driverError as { code?: string } | undefined;
    return driverError?.code === '23505';
  }
}

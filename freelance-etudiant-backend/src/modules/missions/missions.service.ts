import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Mission } from './entities/mission.entity';
import { CreateMissionDto, UpdateMissionDto } from './dto/mission.dto';
import { FiltrerMissionsDto } from './dto/filtrer-missions.dto';
import { StatutMission } from '../../common/enums/statut-mission.enum';
import { StatutCandidature } from '../../common/enums/statut-candidature.enum';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  dateLimiteDepassee,
  jourCourant,
  versJourIso,
} from '../../common/utils/date-limite.util';
import { projeterMission } from '../../common/utils/projection-publique.util';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private readonly repo: Repository<Mission>,
  ) {}

  async create(clientId: string, dto: CreateMissionDto): Promise<Mission> {
    // Date limite inclusive : le jour meme reste valable jusqu'a minuit
    // (fuseau Madagascar). Seul un jour deja passe est refuse.
    const jourLimite = versJourIso(dto.dateLimite);
    if (jourLimite < jourCourant()) {
      throw new BadRequestException(
        'La date limite ne peut pas etre dans le passe',
      );
    }
    const mission = this.repo.create({
      ...dto,
      // Chaine YYYY-MM-DD : evite tout decalage de fuseau a l'ecriture
      // dans la colonne SQL `date`.
      dateLimite: jourLimite as unknown as Date,
      clientId,
      competencesRequises: dto.competencesRequises ?? [],
      statut: StatutMission.OUVERTE,
    });
    return this.repo.save(mission);
  }

  async findAll(filtres: FiltrerMissionsDto) {
    const query = this.repo
      .createQueryBuilder('mission')
      .leftJoinAndSelect('mission.client', 'client')
      .leftJoinAndSelect('client.utilisateur', 'utilisateur')
      .where('mission.estModere = true')
      .andWhere('mission.statut = :statut', { statut: StatutMission.OUVERTE })
      // Filet de securite d'expiration (double protection avec
      // ExpirationMissionsService qui fait la transition de statut) :
      // une mission dont le jour limite est passe ne doit jamais
      // apparaitre dans l'annuaire, meme entre deux balayages. Le jour
      // limite lui-meme reste inclus (meme semantique que
      // dateLimiteDepassee, RG3).
      .andWhere('mission.dateLimite >= :aujourdhui', {
        aujourdhui: jourCourant(),
      });

    if (filtres.motsCles) {
      query.andWhere(
        '(mission.titre ILIKE :motsCles OR mission.description ILIKE :motsCles)',
        { motsCles: `%${filtres.motsCles}%` },
      );
    }
    if (filtres.categorie) {
      query.andWhere('mission.categorie = :categorie', {
        categorie: filtres.categorie,
      });
    }
    if (filtres.competence) {
      query.andWhere(':competence = ANY(mission.competencesRequises)', {
        competence: filtres.competence,
      });
    }
    if (filtres.budgetMin !== undefined) {
      query.andWhere('mission.budget >= :budgetMin', {
        budgetMin: filtres.budgetMin,
      });
    }
    if (filtres.budgetMax !== undefined) {
      query.andWhere('mission.budget <= :budgetMax', {
        budgetMax: filtres.budgetMax,
      });
    }
    const limite = filtres.limite ?? 100;
    const page = filtres.page ?? 1;
    const missions = await query
      .orderBy('mission.dateCreation', 'DESC')
      .take(limite)
      .skip((page - 1) * limite)
      .getMany();

    // Projection publique : jamais d'email, de telephone ni de compte.
    return missions.map(projeterMission);
  }

  async findOne(id: string): Promise<Mission> {
    const mission = await this.repo.findOne({
      where: { id },
      relations: ['client', 'client.utilisateur', 'candidatures'],
    });
    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }
    return mission;
  }

  /**
   * Detail PUBLIC d'une mission (GET /missions/:id) :
   * - projection en liste blanche (ni email, ni telephone, ni candidatures :
   *   les offres des etudiants ne sont visibles que du proprietaire via
   *   GET /missions/:id/candidatures) ;
   * - une mission non moderee (mission privee nee d'une commande de
   *   service, ou masquee par l'admin) n'est visible que de son client, d'un
   *   admin ou d'un etudiant qui y est candidat ; pour les autres elle
   *   n'existe pas (404).
   */
  async findOnePublic(id: string, viewer?: AuthenticatedUser | null) {
    const mission = await this.repo.findOne({
      where: { id },
      relations: ['client', 'client.utilisateur'],
    });
    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (!mission.estModere) {
      const autorise =
        !!viewer &&
        (viewer.role === Role.ADMIN ||
          viewer.id === mission.clientId ||
          (await this.estCandidat(id, viewer.id)));
      if (!autorise) {
        throw new NotFoundException('Mission introuvable');
      }
    }
    return projeterMission(mission);
  }

  private async estCandidat(
    missionId: string,
    utilisateurId: string,
  ): Promise<boolean> {
    const nombre = await this.repo
      .createQueryBuilder('mission')
      .innerJoin('mission.candidatures', 'candidature')
      .where('mission.id = :missionId', { missionId })
      .andWhere('candidature.etudiantId = :utilisateurId', { utilisateurId })
      .getCount();
    return nombre > 0;
  }

  async findByClient(clientId: string): Promise<Mission[]> {
    return this.repo.find({
      where: { clientId },
      relations: ['candidatures'],
      order: { dateCreation: 'DESC' },
    });
  }

  async update(
    id: string,
    clientId: string,
    dto: UpdateMissionDto,
  ): Promise<Mission> {
    const mission = await this.findOne(id);
    if (mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres missions',
      );
    }
    // ============================================================
    // Transitions impossibles interdites : une mission TERMINEE ou
    // FERMEE n'est plus modifiable, comme si elle etait ouverte. Une
    // fois le projet cloture (livraison validee + paiement + evaluation)
    // ou ferme, ses parametres (budget, description, date limite...)
    // sont figes : modifier le budget d'une mission terminee fausserait
    // le prix convenu avec l'etudiant (source de verite financiere).
    // Les statuts OUVERTE / EXPIREE restent editables (reouverture
    // possible en prolongeant la date limite, voir ci-dessous).
    // ============================================================
    if (
      mission.statut === StatutMission.TERMINEE ||
      mission.statut === StatutMission.FERMEE
    ) {
      throw new ConflictException(
        `Cette mission est ${mission.statut === StatutMission.TERMINEE ? 'terminee' : 'fermee'} : elle ne peut plus etre modifiee.`,
      );
    }
    // La date limite n'est validee QUE si elle change : le formulaire
    // renvoie toujours la date existante, et une mission EN_COURS (ou dont
    // la date arrive a echeance) doit rester modifiable (titre, image...).
    let nouvelleDateLimite: string | undefined;
    if (dto.dateLimite) {
      const jour = versJourIso(dto.dateLimite);
      if (jour !== versJourIso(mission.dateLimite)) {
        if (jour < jourCourant()) {
          throw new BadRequestException(
            'La date limite ne peut pas etre dans le passe',
          );
        }
        nouvelleDateLimite = jour;
      }
    }
    const modifications: Partial<UpdateMissionDto> = { ...dto };
    delete modifications.dateLimite;
    Object.assign(mission, modifications);
    if (nouvelleDateLimite) {
      mission.dateLimite = nouvelleDateLimite as unknown as Date;
    }
    // Reouverture : une mission passee a EXPIREE dont le proprietaire
    // prolonge la date limite dans le futur redevient OUVERTE (elle
    // reapparait alors dans l'annuaire et accepte de nouveau les
    // candidatures, sous reserve des autres regles RG3).
    if (
      mission.statut === StatutMission.EXPIREE &&
      nouvelleDateLimite &&
      nouvelleDateLimite >= jourCourant()
    ) {
      mission.statut = StatutMission.OUVERTE;
    }
    return this.repo.save(mission);
  }

  async remove(id: string, clientId: string): Promise<void> {
    const mission = await this.findOne(id);
    if (mission.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres missions',
      );
    }
    // ============================================================
    // Protection de l'integrite : une mission EN_COURS (candidature
    // acceptee) ou TERMINEE porte un historique metier (livraisons,
    // paiements RESTRICT, evaluations). Sa suppression brutale echouerait
    // soit avec une erreur SQL 23503 exposee en 500 (transaction RESTRICT),
    // soit en detruisant le workflow en cours. Seules les missions sans
    // candidature acceptee peuvent etre supprimees physiquement.
    // ============================================================
    if (
      mission.statut === StatutMission.EN_COURS ||
      mission.statut === StatutMission.TERMINEE
    ) {
      throw new ConflictException(
        'Cette mission est en cours ou terminee : elle ne peut pas etre supprimee (un historique metier lui est rattache).',
      );
    }
    const nombreCandidaturesAcceptees = (mission.candidatures ?? []).filter(
      (candidature) => candidature.statut === StatutCandidature.ACCEPTEE,
    ).length;
    if (nombreCandidaturesAcceptees > 0) {
      throw new ConflictException(
        'Cette mission a une candidature acceptee : elle ne peut pas etre supprimee.',
      );
    }
    await this.repo.remove(mission);
  }

  async setModeration(id: string, estModere: boolean): Promise<Mission> {
    const mission = await this.findOne(id);
    mission.estModere = estModere;
    return this.repo.save(mission);
  }

  /**
   * Transition de statut interne (appels services : acceptation de
   * candidature -> EN_COURS, evaluation finale -> TERMINEE).
   * Carte des transitions legales : tout autre passage est refuse. Une
   * mission fermee/terminee ne peut jamais redevenir active (RG3).
   */
  private static readonly TRANSITIONS_AUTORISEES: Readonly<
    Record<StatutMission, readonly StatutMission[]>
  > = {
    [StatutMission.OUVERTE]: [StatutMission.EN_COURS],
    [StatutMission.EN_COURS]: [StatutMission.TERMINEE],
    [StatutMission.TERMINEE]: [],
    [StatutMission.FERMEE]: [],
    [StatutMission.EXPIREE]: [],
  };

  async setStatut(id: string, statut: StatutMission): Promise<Mission> {
    const mission = await this.findOne(id);
    if (
      !MissionsService.TRANSITIONS_AUTORISEES[mission.statut].includes(statut)
    ) {
      throw new ConflictException(
        `Transition de statut impossible : ${mission.statut} -> ${statut}`,
      );
    }
    mission.statut = statut;
    return this.repo.save(mission);
  }

  /**
   * Cree une mission "privee" issue de l'acceptation d'une demande de
   * service (RGds3) : le client a commande directement un service publie
   * par un etudiant, avec un cahier des charges. Cette mission n'est pas
   * moderee/publique (elle ne doit pas apparaitre dans le panneau
   * d'affichage ni recevoir d'autres candidatures) ; elle sert uniquement
   * de support au cycle existant (livraison, paiement, messagerie).
   *
   * `manager` (optionnel) : permet d'executer la creation DANS la
   * transaction de l'appelant (DemandesServiceService.accepter) afin que
   * mission + candidature + demande soient atomiques.
   */
  async creerDepuisDemandeService(
    params: {
      clientId: string;
      titre: string;
      description: string;
      budget: number;
      delaiJours: number;
      categorie: string;
      competencesRequises: string[];
    },
    manager?: EntityManager,
  ): Promise<Mission> {
    const repo = manager?.getRepository(Mission) ?? this.repo;

    const echeance = new Date();
    echeance.setDate(echeance.getDate() + Math.max(1, params.delaiJours));
    const dateLimite = versJourIso(echeance) as unknown as Date;

    const mission = repo.create({
      titre: params.titre,
      description: params.description,
      budget: params.budget,
      dateLimite,
      categorie: params.categorie,
      competencesRequises: params.competencesRequises,
      clientId: params.clientId,
      statut: StatutMission.EN_COURS,
      estModere: false,
    });
    return repo.save(mission);
  }

  /**
   * RG3 : une mission ne peut plus recevoir de candidature apres sa date
   * limite. Utilise par CandidaturesService avant creation d'une candidature.
   */
  assertMissionOuverteAuxCandidatures(mission: Mission): void {
    if (mission.statut !== StatutMission.OUVERTE) {
      throw new BadRequestException(
        "Cette mission n'accepte plus de nouvelles candidatures",
      );
    }
    if (dateLimiteDepassee(mission.dateLimite)) {
      throw new BadRequestException(
        'La date limite de candidature pour cette mission est depassee',
      );
    }
  }

  /**
   * Test d'expiration partage (meme semantique que
   * assertMissionOuverteAuxCandidatures : une mission est expiree des que
   * le jour de sa date limite est strictement passe ; ce jour lui-meme,
   * inclus, est le dernier jour utile).
   */
  estExpiree(mission: Pick<Mission, 'dateLimite'>): boolean {
    return dateLimiteDepassee(mission.dateLimite);
  }

  /**
   * Expiration des missions arrivees a echeance (RG3) :
   * passe chaque mission publique encore OUVERTE dont la date limite est
   * depassee au statut EXPIREE, et retourne les missions transitionnees
   * afin qu'un notification unique puisse etre envoyee au client
   * proprietaire (voir ExpirationMissionsService).
   *
   * Garantie anti-doublon : la mise a jour est conditionnee au statut
   * courant (UPDATE ... WHERE statut = 'ouverte'). Seul l'appel qui voit
   * son UPDATE affecter une ligne a le droit de notifier ; deux balayages
   * concurrents ne peuvent donc jamais notifier deux fois la meme mission.
   * La mission n'est JAMAIS supprimee : elle reste consultable dans
   * l'historique du client (findByClient retourne tous les statuts).
   */
  async expirerMissionsArriveesAEcheance(): Promise<Mission[]> {
    const candidates = await this.repo.find({
      where: { statut: StatutMission.OUVERTE },
      select: ['id', 'titre', 'clientId', 'dateLimite', 'statut'],
    });

    const expirees: Mission[] = [];
    for (const mission of candidates) {
      if (!this.estExpiree(mission)) continue;

      const resultat = await this.repo.update(
        // Condition de course : ne transitionne que si toujours OUVERTE.
        { id: mission.id, statut: StatutMission.OUVERTE },
        { statut: StatutMission.EXPIREE },
      );

      if (resultat.affected && resultat.affected > 0) {
        expirees.push({ ...mission, statut: StatutMission.EXPIREE });
      }
    }
    return expirees;
  }
}

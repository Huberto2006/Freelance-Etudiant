import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { Role } from '../../common/enums/role.enum';

/**
 * Limite raisonnable de resultats pour l'autocompletion @mention :
 * la recherche est faite par le backend (jamais la liste complete des
 * utilisateurs cote frontend).
 */
const LIMITE_SUGGESTIONS_MENTION = 8;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepo: Repository<Utilisateur>,
  ) {}

  async findByEmail(email: string): Promise<Utilisateur | null> {
    return this.utilisateurRepo.findOne({ where: { email } });
  }

  async findByResetToken(hashedToken: string): Promise<Utilisateur | null> {
    return this.utilisateurRepo.findOne({
      where: { resetPasswordToken: hashedToken },
    });
  }

  /**
   * Verification d'email : retrouve le compte a partir de l'empreinte du
   * jeton de verification recu dans le lien email.
   */
  async findByEmailVerificationToken(
    hashedToken: string,
  ): Promise<Utilisateur | null> {
    return this.utilisateurRepo.findOne({
      where: { emailVerificationTokenHash: hashedToken },
    });
  }

  async findById(id: string): Promise<Utilisateur | null> {
    return this.utilisateurRepo.findOne({
      where: { id },
      relations: ['profilEtudiant', 'profilClient'],
    });
  }

  async findByIdOrFail(id: string): Promise<Utilisateur> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  /**
   * RG7 : l'adresse email doit etre unique dans le systeme.
   */
  async assertEmailDisponible(email: string): Promise<void> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Cette adresse email est deja utilisee');
    }
  }

  async create(data: Partial<Utilisateur>): Promise<Utilisateur> {
    const utilisateur = this.utilisateurRepo.create(data);
    return this.utilisateurRepo.save(utilisateur);
  }

  async save(utilisateur: Utilisateur): Promise<Utilisateur> {
    return this.utilisateurRepo.save(utilisateur);
  }

  async findAll(role?: Role): Promise<Utilisateur[]> {
    return this.utilisateurRepo.find({
      where: role ? { role } : {},
      relations: ['profilEtudiant', 'profilClient'],
      order: { dateInscription: 'DESC' },
    });
  }

  /**
   * Recherche des utilisateurs actifs pour l'autocompletion @mention des
   * commentaires. La recherche est faite par le backend avec une limite
   * de resultats (jamais la liste complete cote frontend).
   *
   * Regles :
   * - seuls les utilisateurs existants, actifs et non suspendus sont
   *   suggérés (role etudiant ou client) ;
   * - l'auteur du commentaire est exclu des suggestions (se mentionner
   *   soi-meme n'envoie jamais de notification, cf. MentionService).
   */
  async rechercherSuggestionsMention(
    terme: string,
    excludeId: string | null,
  ): Promise<Utilisateur[]> {
    const query = this.utilisateurRepo
      .createQueryBuilder('utilisateur')
      .leftJoinAndSelect('utilisateur.profilEtudiant', 'profil')
      .where('utilisateur.estActif = true')
      .andWhere('utilisateur.estSuspendu = false')
      .andWhere('utilisateur.role IN (:...roles)', {
        roles: [Role.ETUDIANT, Role.CLIENT],
      });

    const termeNettoye = terme.trim();
    if (termeNettoye) {
      query.andWhere('utilisateur.nom ILIKE :terme', {
        terme: `%${termeNettoye}%`,
      });
    }

    if (excludeId) {
      query.andWhere('utilisateur.id != :excludeId', { excludeId });
    }

    return query
      .orderBy('utilisateur.nom', 'ASC')
      .take(LIMITE_SUGGESTIONS_MENTION)
      .getMany();
  }

  /**
   * Liste legere (id + nom uniquement) des utilisateurs actifs pouvant
   * etre mentions dans un commentaire. Utilisee par le module commentaires
   * pour resoudre les @Nom du texte : la resolution se fait a partir des
   * noms reels en base, JAMAIS d'identifiant envoye par le frontend.
   */
  async findIdNomActifs(): Promise<{ id: string; nom: string }[]> {
    return this.utilisateurRepo.find({
      select: { id: true, nom: true },
      where: {
        estActif: true,
        estSuspendu: false,
        role: In([Role.ETUDIANT, Role.CLIENT]),
      },
    });
  }

  /**
   * Fonctionnalites Admin : activation / suspension / suppression de comptes.
   */
  async setSuspendu(id: string, estSuspendu: boolean): Promise<Utilisateur> {
    const user = await this.findByIdOrFail(id);
    user.estSuspendu = estSuspendu;
    return this.utilisateurRepo.save(user);
  }

  async setActif(id: string, estActif: boolean): Promise<Utilisateur> {
    const user = await this.findByIdOrFail(id);
    user.estActif = estActif;
    return this.utilisateurRepo.save(user);
  }

  /**
   * Suppression definitive d'un compte. Bloquee (409) si l'utilisateur a
   * un historique financier ou des evaluations (RG7/RGp2, contraintes
   * RESTRICT en base) : dans ce cas, utiliser la suspension de compte
   * (`setActif`) plutot qu'une suppression irreversible.
   */
  async remove(id: string): Promise<void> {
    const user = await this.findByIdOrFail(id);
    try {
      await this.utilisateurRepo.remove(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23503'
      ) {
        throw new ConflictException(
          "Ce compte ne peut pas être supprimé définitivement : il a un historique de paiements et/ou d'évaluations. Utilisez la désactivation du compte à la place.",
        );
      }
      throw error;
    }
  }
}

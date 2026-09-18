import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commentaire } from './entities/commentaire.entity';
import { Mention } from './entities/mention.entity';
import { CreerCommentaireDto, ModifierCommentaireDto } from './dto/commentaire.dto';
import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';
import { MissionsService } from '../missions/missions.service';
import { ServicesService } from '../services/services.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';
import { Role } from '../../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { CommentairesGateway } from './commentaires.gateway';
import { VerificationCibleService } from '../../common/services/verification-cible.service';

/**
 * Forme de la reponse de GET /commentaires/mentions-suggestions.
 */
export interface SuggestionMention {
  id: string;
  nom: string;
  role: Role;
  photoUrl: string | null;
  sousTitre: string | null;
}

/**
 * Nombre maximal de fragments @ traites par commentaire (borne de
 * securite : evite toute explosion memoire sur un texte genere).
 */
const MAX_FRAGMENTS_MENTION = 20;

@Injectable()
export class CommentairesService {
  constructor(
    @InjectRepository(Commentaire)
    private readonly repo: Repository<Commentaire>,
    @InjectRepository(Mention)
    private readonly mentionsRepo: Repository<Mention>,
    private readonly missionsService: MissionsService,
    private readonly servicesService: ServicesService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly commentairesGateway: CommentairesGateway,
    private readonly verificationCibleService: VerificationCibleService,
  ) { }

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

  async creer(
    auteurId: string,
    dto: CreerCommentaireDto,
  ): Promise<Commentaire> {
    // RG-068 : verifier AVANT ecriture que la cible (mission ou service)
    // existe reellement et que le type est autorise. Sans cette
    // verification, un commentaire pourrait etre persiste pointant vers
    // une cible inexistante.
    await this.verificationCibleService.assertCibleExistante(
      dto.cibleType,
      dto.cibleId,
    );

    const commentaire = this.repo.create({
      contenu: dto.contenu.trim(),
      cibleType: dto.cibleType,
      cibleId: dto.cibleId,
      auteurId,
    });

    const saved = await this.repo.save(commentaire);

    const { proprietaireId, titre } = await this.resoudreProprietaire(
      dto.cibleType,
      dto.cibleId,
    );

    /**
     * Mentions : traitees UNIQUEMENT apres l'enregistrement reussi du
     * commentaire. Si l'auteur ecrit @Jean mais n'envoie finalement pas
     * le commentaire, aucun enregistrement ni notification ne se produit.
     */
    await this.traiterMentions(
      saved.id,
      saved.contenu,
      auteurId,
      dto.cibleType,
      dto.cibleId,
      titre,
    );

    // Notification au proprietaire du contenu (sauf s'il commente lui-meme).
    if (proprietaireId !== auteurId) {
      const chemin =
        dto.cibleType === TypeCibleContenu.MISSION
          ? 'missions'
          : 'services';

      await this.notificationsService.creer({
        destinataireId: proprietaireId,
        type: TypeNotification.NOUVEAU_COMMENTAIRE,
        titre: 'Nouveau commentaire',
        message: `Un nouveau commentaire a été ajouté sur "${titre}".`,
        lienUrl: `/${chemin}/${dto.cibleId}`,
      });
    }

    const commentaireComplet = await this.findOne(saved.id);

    this.commentairesGateway.diffuserNouveauCommentaire(
      commentaireComplet,
    );

    return commentaireComplet;
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

    /**
     * Met a jour les mentions apres une modification reussie : ajoute
     * uniquement les NOUVELLES mentions (jamais de re-notification des
     * utilisateurs deja mentionnes, jamais de doublon grace a la
     * contrainte unique (commentaire_id, utilisateur_id)).
     */
    const { titre } = await this.resoudreProprietaire(
      commentaire.cibleType,
      commentaire.cibleId,
    );

    await this.traiterMentions(
      commentaire.id,
      commentaire.contenu,
      auteurId,
      commentaire.cibleType,
      commentaire.cibleId,
      titre,
    );

    const commentaireModifie = await this.findOne(id);

    this.commentairesGateway.diffuserCommentaireModifie(
      commentaireModifie,
    );

    return commentaireModifie;
  }

  /**
   * RGc2 : seul l'auteur (ou un administrateur, pour la moderation) peut
   * supprimer un commentaire.
   */
  async supprimer(
    id: string,
    utilisateurId: string,
    estAdmin: boolean,
  ): Promise<void> {
    const commentaire = await this.findOne(id);

    if (
      commentaire.auteurId !== utilisateurId &&
      !estAdmin
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres commentaires',
      );
    }

    const cible = {
      id: commentaire.id,
      cibleType: commentaire.cibleType,
      cibleId: commentaire.cibleId,
    };

    await this.repo.remove(commentaire);

    this.commentairesGateway.diffuserCommentaireSupprime(cible);
  }

  /**
   * Recherche backend des utilisateurs suggérés pour l'autocompletion
   * @mention. Appelée par GET /commentaires/mentions-suggestions (route
   * authentifiée : un utilisateur non connecté ne peut pas préparer de
   * mention). La reponse ne contient que les champs utiles a l'UI.
   */
  async rechercherSuggestionsMention(
    terme: string,
    utilisateurConnecteId: string,
  ): Promise<SuggestionMention[]> {
    const utilisateurs = await this.usersService.rechercherSuggestionsMention(
      terme ?? '',
      utilisateurConnecteId,
    );

    return utilisateurs.map((utilisateur) => ({
      id: utilisateur.id,
      nom: utilisateur.nom,
      role: utilisateur.role,
      photoUrl: utilisateur.photoUrl ?? null,
      sousTitre:
        utilisateur.profilEtudiant?.competences?.[0] ??
        utilisateur.profilEtudiant?.universite ??
        (utilisateur.role === Role.CLIENT ? 'Client' : 'Étudiant'),
    }));
  }

  /**
   * Extrait les textes saisis apres chaque @ d'un commentaire (jusqu'a la
   * fin de ligne ou au @ suivant). Les noms reels en base sont ensuite
   * associes a ces fragments (jamais d'identifiant envoye par le frontend).
   */
  private extraireFragmentsMention(contenu: string): string[] {
    const occurrences = contenu.match(/@([^\n@]{1,60})/g) ?? [];

    return occurrences
      .slice(0, MAX_FRAGMENTS_MENTION)
      .map((occurrence) => occurrence.slice(1).trim())
      .filter((fragment) => fragment.length > 0);
  }

  /**
   * Associe chaque fragment @Nom aux utilisateurs reels de la plateforme.
   *
   * Regles :
   * - seul un utilisateur EXISTANT, actif et non suspendu peut etre
   *   mentionne (un @Nom inconnu reste du simple texte) ;
   * - correspondance par nom, caractere suivant impose non-lettre/non-chiffre
   *   pour ne pas confondre "Jean" et "Jeanne" ;
   * - le nom le plus long gagne (le frontend insere le nom complet :
   *   "@Jean Rakoto" mentionne l'utilisateur "Jean Rakoto", pas "Jean") ;
   * - dedoublonnage par identifiant : le meme utilisateur mentionne
   *   plusieurs fois n'est resolu qu'une seule fois ;
   * - l'auteur ne peut pas se mentionner lui-meme.
   */
  private async resoudreMentionnes(
    contenu: string,
    auteurId: string,
  ): Promise<{ id: string; nom: string }[]> {
    const fragments = this.extraireFragmentsMention(contenu);
    if (fragments.length === 0) return [];

    const candidats = await this.usersService.findIdNomActifs();

    // Tri par nom decroissant : le nom le plus long gagne.
    const triParLongueur = [...candidats].sort(
      (a, b) => b.nom.length - a.nom.length,
    );

    const trouves = new Map<string, { id: string; nom: string }>();

    for (const fragment of fragments) {
      const fragmentMinuscule = fragment.toLowerCase();

      for (const candidat of triParLongueur) {
        const nomMinuscule = candidat.nom.toLowerCase();

        // Le fragment doit commencer par le nom complet.
        if (!fragmentMinuscule.startsWith(nomMinuscule)) continue;

        // Frontiere : le caractere suivant le nom ne doit pas etre une
        // lettre ou un chiffre (evite de confondre "Jean" et "Jeanne",
        // ou "Jean" suivi de "Rakoto" tape comme du texte).
        const caractereSuivant = fragmentMinuscule.charAt(nomMinuscule.length);
        if (
          caractereSuivant !== '' &&
          /[\p{L}\p{N}]/u.test(caractereSuivant)
        ) {
          continue;
        }

        // Le nom le plus long gagne (les candidats sont tries par
        // longueur decroissante) : on retient ce candidat et on passe
        // au fragment suivant.
        trouves.set(candidat.id, candidat);
        break;
      }
    }

    // L'auteur ne peut jamais se mentionner lui-meme.
    trouves.delete(auteurId);

    return [...trouves.values()];
  }

  /**
   * Enregistre les mentions d'un commentaire et notifie les utilisateurs
   * identifies. Appellee UNIQUEMENT apres l'enregistrement reussi du
   * commentaire (en creation comme en modification).
   *
   * Garanties :
   * - jamais de doublon : contrainte unique (commentaire_id,
   *   utilisateur_id) + exclusion des mentions deja existantes ;
   * - pas de notification a l'auteur qui se mentionne ;
   * - une seule notification par utilisateur identifie ;
   * - une erreur de mention ne fait JAMAIS echouer le commentaire
   *   (meme philosophie silencieuse que NotificationsService.creer).
   */
  private async traiterMentions(
    commentaireId: string,
    contenu: string,
    auteurId: string,
    cibleType: TypeCibleContenu,
    cibleId: string,
    titreCible: string,
  ): Promise<void> {
    try {
      const mentionnes = await this.resoudreMentionnes(contenu, auteurId);
      if (mentionnes.length === 0) return;

      const existantes = await this.mentionsRepo.find({
        where: { commentaireId },
        select: { utilisateurId: true },
      });
      const dejaMentionnes = new Set(
        existantes.map((mention) => mention.utilisateurId),
      );

      const nouvelles = mentionnes.filter(
        (utilisateur) => !dejaMentionnes.has(utilisateur.id),
      );
      if (nouvelles.length === 0) return;

      const auteur = await this.usersService.findById(auteurId);
      const nomAuteur = auteur?.nom ?? "Quelqu'un";

      const chemin =
        cibleType === TypeCibleContenu.MISSION ? 'missions' : 'services';
      const lieu =
        cibleType === TypeCibleContenu.MISSION ? 'une mission' : 'un service';

      await this.mentionsRepo.save(
        nouvelles.map((utilisateur) =>
          this.mentionsRepo.create({
            commentaireId,
            utilisateurId: utilisateur.id,
          }),
        ),
      );

      for (const utilisateur of nouvelles) {
        await this.notificationsService.creer({
          destinataireId: utilisateur.id,
          type: TypeNotification.MENTION,
          titre: 'Nouvelle mention',
          message: `${nomAuteur} vous a identifié dans ${lieu} "${titreCible}".`,
          lienUrl: `/${chemin}/${cibleId}`,
        });
      }
    } catch {
      // Volontairement silencieux : une mention manquee ne doit jamais
      // faire echouer l'enregistrement du commentaire.
    }
  }
}

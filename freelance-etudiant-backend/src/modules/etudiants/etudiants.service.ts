import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtudiantProfile } from './entities/etudiant-profile.entity';
import { UpdateEtudiantProfileDto } from './dto/update-etudiant-profile.dto';
import { FiltrerEtudiantsDto } from './dto/filtrer-etudiants.dto';
import { ProfilEtudiantPublicDto } from './dto/profil-etudiant-public.dto';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';
import { projeterEtudiant } from '../../common/utils/projection-publique.util';

@Injectable()
export class EtudiantsService {
  constructor(
    @InjectRepository(EtudiantProfile)
    private readonly repo: Repository<EtudiantProfile>,
    private readonly profileCompletionService: ProfileCompletionService,
  ) {}

  async findByUtilisateurId(utilisateurId: string): Promise<EtudiantProfile> {
    const profil = await this.repo.findOne({
      where: { utilisateurId },
      relations: ['utilisateur'],
    });
    if (!profil) {
      throw new NotFoundException('Profil etudiant introuvable');
    }
    return profil;
  }

  /**
   * Annuaire PUBLIC des etudiants (GET /etudiants) : projection en liste
   * blanche (jamais d'email, de telephone ni d'etat de compte) et
   * pagination (evite qu'un script aspire tout l'annuaire en un appel).
   */
  async findAll(filtres: FiltrerEtudiantsDto) {
    const query = this.repo
      .createQueryBuilder('etudiant')
      .leftJoinAndSelect('etudiant.utilisateur', 'utilisateur')
      .where('utilisateur.estActif = true')
      .andWhere('utilisateur.estSuspendu = false');

    if (filtres.competence) {
      query.andWhere(':competence = ANY(etudiant.competences)', {
        competence: filtres.competence,
      });
    }

    const limite = filtres.limite ?? 50;
    const page = filtres.page ?? 1;
    const etudiants = await query
      .orderBy('etudiant.scoreReputation', 'DESC')
      .take(limite)
      .skip((page - 1) * limite)
      .getMany();

    return etudiants.map(projeterEtudiant);
  }

  /**
   * Fiche publique d'un étudiant : construit une liste blanche distincte
   * de l'entité TypeORM pour ne jamais sérialiser ses champs privés.
   */
  async findOnePublic(
    utilisateurId: string,
  ): Promise<ProfilEtudiantPublicDto> {
    const profil = await this.findByUtilisateurId(utilisateurId);
    return {
      utilisateurId: profil.utilisateurId,
      universite: profil.universite ?? null,
      niveauEtude: profil.niveauEtude ?? null,
      filiere: profil.filiere ?? null,
      anneeEtude: profil.anneeEtude ?? null,
      ville: profil.ville ?? null,
      specialites: profil.specialites ?? [],
      experience: profil.experience,
      typeFreelance: profil.typeFreelance ?? null,
      statutDisponibilite: profil.statutDisponibilite ?? null,
      tarifHoraire: profil.tarifHoraire ?? null,
      tarifMinimum: profil.tarifMinimum ?? null,
      tarifMaximum: profil.tarifMaximum ?? null,
      githubUrl: profil.githubUrl ?? null,
      gitlabUrl: profil.gitlabUrl ?? null,
      linkedinUrl: profil.linkedinUrl ?? null,
      siteWeb: profil.siteWeb ?? null,
      competences: profil.competences ?? [],
      langues: profil.langues ?? [],
      disponibilite: profil.disponibilite,
      description: profil.description ?? null,
      portfolioUrls: profil.portfolioUrls ?? [],
      scoreReputation: profil.scoreReputation,
      noteMoyenne: profil.noteMoyenne,
      nombreMissionsTerminees: profil.nombreMissionsTerminees,
      utilisateur: profil.utilisateur
        ? {
            id: profil.utilisateur.id,
            nom: profil.utilisateur.nom,
            photoUrl: profil.utilisateur.photoUrl ?? null,
          }
        : null,
    };
  }

  /**
   * Mise a jour partielle du profil (questionnaire progressif) : le DTO
   * etant entierement optionnel, seule la classe fournie par le frontend
   * est appliquee — il n'est jamais necessaire d'envoyer le profil
   * complet en une seule requete.
   */
  async update(
    utilisateurId: string,
    dto: UpdateEtudiantProfileDto,
  ): Promise<EtudiantProfile> {
    const profil = await this.findByUtilisateurId(utilisateurId);

    // Regle metier : la borne basse de la fourchette de tarif ne peut pas
    // depasser la borne haute (comparaison sur l'etat APRES application).
    const tarifMin = dto.tarifMinimum ?? profil.tarifMinimum;
    const tarifMax = dto.tarifMaximum ?? profil.tarifMaximum;
    if (
      tarifMin != null &&
      tarifMax != null &&
      Number(tarifMin) > Number(tarifMax)
    ) {
      throw new BadRequestException(
        'Le tarif minimum ne peut pas etre superieur au tarif maximum',
      );
    }

    // Coherence entre le tarif horaire et la fourchette min/max (etape
    // Tarification du questionnaire) : le tarif horaire affiche doit
    // rester dans la fourchette annoncee quand celle-ci est renseignee.
    const tarifHoraire = dto.tarifHoraire ?? profil.tarifHoraire;
    if (tarifHoraire != null && tarifMin != null && Number(tarifHoraire) < Number(tarifMin)) {
      throw new BadRequestException(
        'Le tarif horaire ne peut pas etre inferieur au tarif minimum',
      );
    }
    if (tarifHoraire != null && tarifMax != null && Number(tarifHoraire) > Number(tarifMax)) {
      throw new BadRequestException(
        'Le tarif horaire ne peut pas etre superieur au tarif maximum',
      );
    }

    Object.assign(profil, dto);
    const sauvegarde = await this.repo.save(profil);

    // Source de verite serveur : recalcul de profil_complete apres chaque
    // sauvegarde (le frontend ne peut jamais forcer cette valeur).
    await this.profileCompletionService.synchroniserProfilComplete(utilisateurId);

    return sauvegarde;
  }
}

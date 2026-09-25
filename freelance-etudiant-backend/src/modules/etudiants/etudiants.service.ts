import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtudiantProfile } from './entities/etudiant-profile.entity';
import { UpdateEtudiantProfileDto } from './dto/update-etudiant-profile.dto';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';

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

  async findAll(competence?: string): Promise<EtudiantProfile[]> {
    const query = this.repo
      .createQueryBuilder('etudiant')
      .leftJoinAndSelect('etudiant.utilisateur', 'utilisateur')
      .where('utilisateur.estActif = true')
      .andWhere('utilisateur.estSuspendu = false');

    if (competence) {
      query.andWhere(':competence = ANY(etudiant.competences)', { competence });
    }
    return query.orderBy('etudiant.scoreReputation', 'DESC').getMany();
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

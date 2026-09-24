import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProfile } from './entities/client-profile.entity';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { TypeClient } from '../../common/enums/type-client.enum';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientProfile)
    private readonly repo: Repository<ClientProfile>,
    private readonly profileCompletionService: ProfileCompletionService,
  ) {}

  async findByUtilisateurId(utilisateurId: string): Promise<ClientProfile> {
    const profil = await this.repo.findOne({
      where: { utilisateurId },
      relations: ['utilisateur'],
    });
    if (!profil) {
      throw new NotFoundException('Profil client introuvable');
    }
    return profil;
  }

  /**
   * Mise a jour partielle du profil (questionnaire progressif) : seule la
   * classe fournie par le frontend est appliquee, il n'est jamais
   * necessaire d'envoyer le profil complet en une seule requete.
   */
  async update(
    utilisateurId: string,
    dto: UpdateClientProfileDto,
  ): Promise<ClientProfile> {
    const profil = await this.findByUtilisateurId(utilisateurId);
    if (dto.typeClient) {
      profil.typeClient = dto.typeClient;
    }
    // Coherence avec le dictionnaire des donnees : nomEntreprise nul si particulier.
    if (profil.typeClient === TypeClient.PARTICULIER) {
      profil.nomEntreprise = undefined;
    } else if (dto.nomEntreprise !== undefined) {
      profil.nomEntreprise = dto.nomEntreprise;
    }

    // Regle metier : la borne basse du budget ne peut pas depasser la
    // borne haute (comparaison sur l'etat APRES application, pour gerer
    // la mise a jour d'un seul des deux champs).
    const budgetMin = dto.budgetMin ?? profil.budgetMin;
    const budgetMax = dto.budgetMax ?? profil.budgetMax;
    if (
      budgetMin != null &&
      budgetMax != null &&
      Number(budgetMin) > Number(budgetMax)
    ) {
      throw new BadRequestException(
        'Le budget minimum ne peut pas etre superieur au budget maximum',
      );
    }

    // Application partielle des autres champs (undefined = non fourni).
    const champs: (keyof UpdateClientProfileDto)[] = [
      'secteurActivite',
      'description',
      'ville',
      'telephone',
      'siteWeb',
      'budgetMin',
      'budgetMax',
      'typesProjets',
      'besoinsFreelance',
      'nombreProjets',
    ];
    for (const champ of champs) {
      const valeur = dto[champ];
      if (valeur !== undefined) {
        (profil as unknown as Record<string, unknown>)[champ] = valeur;
      }
    }

    return this.saveAvecCompletion(profil, utilisateurId);
  }

  /**
   * Sauvegarde puis recalcul serveur de profil_complete (le frontend ne
   * peut jamais forcer cette valeur).
   */
  private async saveAvecCompletion(
    profil: ClientProfile,
    utilisateurId: string,
  ): Promise<ClientProfile> {
    const sauvegarde = await this.repo.save(profil);
    await this.profileCompletionService.synchroniserProfilComplete(utilisateurId);
    return sauvegarde;
  }
}

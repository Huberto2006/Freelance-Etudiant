import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import { Repository } from 'typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepository: Repository<Utilisateur>,
  ) {}

  async saveProfilePhoto(
    utilisateurId: string,
    filename: string,
  ) {
    const utilisateur =
      await this.utilisateurRepository.findOne({
        where: { id: utilisateurId },
      });

    if (!utilisateur) {
      throw new NotFoundException(
        'Utilisateur introuvable',
      );
    }

    const url = `/uploads/profiles/${filename}`;

    // Ancienne photo a remplacer (stockage : sans ce nettoyage, chaque
    // changement de photo laisse l'ancien fichier orphelin sur le disque).
    const anciennePhotoUrl = utilisateur.photoUrl;

    utilisateur.photoUrl = url;

    await this.utilisateurRepository.save(utilisateur);

    // Suppression de l'ancien fichier APRES l'enregistrement reussi.
    // basename() empeche toute remontee de repertoire (path traversal) :
    // seuls les fichiers directement presents dans uploads/profiles sont
    // supprimables. Un echec de suppression est journalise sans faire
    // echouer l'upload (l'ancienne photo orpheline n'est pas critique).
    if (
      anciennePhotoUrl &&
      anciennePhotoUrl !== url &&
      anciennePhotoUrl.startsWith('/uploads/profiles/')
    ) {
      const cheminAncien = join(
        process.cwd(),
        'uploads',
        'profiles',
        basename(anciennePhotoUrl),
      );
      try {
        if (existsSync(cheminAncien)) {
          unlinkSync(cheminAncien);
        }
      } catch (error) {
        this.logger.warn(
          `Suppression de l'ancienne photo impossible (${anciennePhotoUrl}) : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      message: 'Photo de profil enregistrée avec succès',
      url,
    };
  }

  /**
   * Formate la reponse d'un upload de document generique (piece jointe
   * de message ou de cahier des charges) : conserve le nom original du
   * fichier pour l'affichage/telechargement cote client, meme si le
   * fichier est stocke sous un nom UUID sur le disque.
   */
  formatDocumentResponse(file: Express.Multer.File) {
    return {
      url: `/uploads/documents/${file.filename}`,
      nomFichier: file.originalname,
      tailleOctets: file.size,
    };
  }
}
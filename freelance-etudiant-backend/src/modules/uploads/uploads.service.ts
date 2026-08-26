import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';

@Injectable()
export class UploadsService {
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

    utilisateur.photoUrl = url;

    await this.utilisateurRepository.save(utilisateur);

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
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
}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ProfileCompletionService } from './profile-completion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, EtudiantProfile, ClientProfile]),
  ],
  providers: [ProfileCompletionService],
  exports: [ProfileCompletionService],
})
export class ProfileCompletionModule {}
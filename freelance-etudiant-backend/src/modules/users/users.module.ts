import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Utilisateur } from './entities/utilisateur.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { ClientProfile } from '../clients/entities/client-profile.entity';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfileCompletionController } from '../profile-completion/profile-completion.controller';
import { ProfileCompletionService } from '../profile-completion/profile-completion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, EtudiantProfile, ClientProfile]),
  ],

  providers: [
    UsersService,
    ProfileCompletionService,
  ],

  controllers: [
    UsersController,
    ProfileCompletionController,
  ],

  exports: [
    UsersService,
    ProfileCompletionService,
  ],
})
export class UsersModule {}
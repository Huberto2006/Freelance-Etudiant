import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Groupe } from './entities/groupe.entity';
import { MembreGroupe } from './entities/membre-groupe.entity';
import { InvitationGroupe } from './entities/invitation-groupe.entity';

import { Mission } from '../missions/entities/mission.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';

import { NotificationsModule } from '../notifications/notifications.module';

import { GroupesController } from './groupes.controller';
import { GroupesService } from './groupes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Groupe,
      MembreGroupe,
      InvitationGroupe,
      Mission,
      EtudiantProfile,
    ]),

    NotificationsModule,
  ],

  controllers: [GroupesController],

  providers: [GroupesService],

  exports: [GroupesService],
})
export class GroupesModule {}

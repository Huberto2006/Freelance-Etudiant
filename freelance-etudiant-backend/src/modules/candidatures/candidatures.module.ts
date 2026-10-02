import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidature } from './entities/candidature.entity';
import { CandidaturesService } from './candidatures.service';
import { CandidaturesController } from './candidatures.controller';
import { MissionsModule } from '../missions/missions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailsModule } from '../emails/emails.module';
import { GroupesModule } from '../groupes/groupes.module';
import { Groupe } from '../groupes/entities/groupe.entity';
import { MembreGroupe } from '../groupes/entities/membre-groupe.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Candidature, 
      Groupe, 
      MembreGroupe,
    ]),
    MissionsModule,
    NotificationsModule,
    EmailsModule,
    GroupesModule,
  ],
  providers: [CandidaturesService],
  controllers: [CandidaturesController],
  exports: [CandidaturesService],
})
export class CandidaturesModule {}

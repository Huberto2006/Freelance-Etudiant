import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemandeService } from './entities/demande-service.entity';
import { DemandesServiceService } from './demandes-service.service';
import { DemandesServiceController } from './demandes-service.controller';
import { ServicesModule } from '../services/services.module';
import { MissionsModule } from '../missions/missions.module';
import { CandidaturesModule } from '../candidatures/candidatures.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DemandeService]),
    ServicesModule,
    MissionsModule,
    CandidaturesModule,
    NotificationsModule,
    EmailsModule,
  ],
  providers: [DemandesServiceService],
  controllers: [DemandesServiceController],
  exports: [DemandesServiceService],
})
export class DemandesServiceModule {}

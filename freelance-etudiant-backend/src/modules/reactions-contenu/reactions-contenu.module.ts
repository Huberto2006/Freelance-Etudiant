import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionContenu } from './entities/reaction-contenu.entity';
import { ReactionsContenuService } from './reactions-contenu.service';
import { ReactionsContenuController } from './reactions-contenu.controller';
import { MissionsModule } from '../missions/missions.module';
import { ServicesModule } from '../services/services.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CiblesModule } from '../cibles/cibles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReactionContenu]),
    MissionsModule,
    ServicesModule,
    NotificationsModule,
    CiblesModule,
  ],
  providers: [ReactionsContenuService],
  controllers: [ReactionsContenuController],
})
export class ReactionsContenuModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Commentaire } from './entities/commentaire.entity';

import { CommentairesService } from './commentaires.service';
import { CommentairesController } from './commentaires.controller';
import { CommentairesGateway } from './commentaires.gateway';

import { MissionsModule } from '../missions/missions.module';
import { ServicesModule } from '../services/services.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commentaire]),
    MissionsModule,
    ServicesModule,
    NotificationsModule,
  ],
  providers: [
    CommentairesService,
    CommentairesGateway,
  ],
  controllers: [CommentairesController],
})
export class CommentairesModule {}
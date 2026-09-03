import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Livraison } from './entities/livraison.entity';
import { LivraisonsService } from './livraisons.service';
import { LivraisonsController } from './livraisons.controller';
import { CandidaturesModule } from '../candidatures/candidatures.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaiementsModule } from '../paiements/paiements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Livraison]),
    CandidaturesModule,
    NotificationsModule,
    PaiementsModule,
  ],
  providers: [LivraisonsService],
  controllers: [LivraisonsController],
  exports: [LivraisonsService],
})
export class LivraisonsModule {}

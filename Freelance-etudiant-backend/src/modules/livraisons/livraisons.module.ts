import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Livraison } from './entities/livraison.entity';
import { LivraisonsService } from './livraisons.service';
import { LivraisonsController } from './livraisons.controller';
import { CandidaturesModule } from '../candidatures/candidatures.module';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Livraison]),
    CandidaturesModule,
    MissionsModule,
  ],
  providers: [LivraisonsService],
  controllers: [LivraisonsController],
  exports: [LivraisonsService],
})
export class LivraisonsModule {}

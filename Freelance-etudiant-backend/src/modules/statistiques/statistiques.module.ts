import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { Mission } from '../missions/entities/mission.entity';
import { Candidature } from '../candidatures/entities/candidature.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { StatistiquesService } from './statistiques.service';
import { StatistiquesController } from './statistiques.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, Mission, Candidature, Livraison]),
  ],
  providers: [StatistiquesService],
  controllers: [StatistiquesController],
})
export class StatistiquesModule {}

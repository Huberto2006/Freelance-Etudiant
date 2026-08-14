import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Candidature } from '../candidatures/entities/candidature.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { ReputationService } from './reputation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EtudiantProfile, Evaluation, Candidature, Livraison]),
  ],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}

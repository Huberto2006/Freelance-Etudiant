import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { Transaction } from '../paiements/entities/transaction.entity';
import { EvaluationsService } from './evaluations.service';
import { EvaluationsController } from './evaluations.controller';
import { LivraisonsModule } from '../livraisons/livraisons.module';
import { ReputationModule } from '../reputation/reputation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [
    // Transaction est chargee ici (lecture seule) pour la regle metier
    // "evaluation possible seulement apres confirmation du paiement".
    // Aucune dependance vers PaiementsModule : celui-ci n'exporte que le
    // service de paiement et evaluer ne necessite qu'une lecture du
    // statut de la transaction.
    TypeOrmModule.forFeature([Evaluation, Transaction]),
    LivraisonsModule,
    ReputationModule,
    NotificationsModule,
    MissionsModule,
  ],
  providers: [EvaluationsService],
  controllers: [EvaluationsController],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}

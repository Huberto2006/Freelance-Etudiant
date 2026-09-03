import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { Livraison } from '../livraisons/entities/livraison.entity';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';
import { CandidaturesModule } from '../candidatures/candidatures.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MvolaService } from './mvola.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // Livraison est chargee ici (lecture seule) pour la regle metier
    // "paiement autorise seulement apres validation de la livraison".
    // Aucune dependance vers LivraisonsModule : LivraisonsModule importe
    // deja PaiementsModule (liberation des fonds), on evite donc un cycle.
    TypeOrmModule.forFeature([Transaction, Livraison]),
    CandidaturesModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [PaiementsService, MvolaService],
  controllers: [PaiementsController],
  exports: [PaiementsService],
})
export class PaiementsModule {}

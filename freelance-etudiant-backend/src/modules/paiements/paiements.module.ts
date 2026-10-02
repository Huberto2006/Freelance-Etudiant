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
import { MoyensPaiementModule } from '../moyens-paiement/moyens-paiement.module';
import { MoyensPaiementClientModule } from '../moyens-paiement-client/moyens-paiement-client.module';

@Module({
  imports: [
    // Livraison est chargee ici (lecture seule) pour verifier si une
    // livraison deja validee doit declencher une liberation immediate
    // des fonds au moment de la confirmation (modele sequestre). Aucune
    // dependance vers LivraisonsModule : LivraisonsModule importe deja
    // PaiementsModule (liberation des fonds), on evite donc un cycle.
    TypeOrmModule.forFeature([Transaction, Livraison]),
    CandidaturesModule,
    NotificationsModule,
    UsersModule,
    // RG-PAY : verification (propriete/actif) du moyen de paiement
    // attache a une transaction et liste securisee des coordonnees du
    // beneficiaire. Aucune dependance inverse : pas de cycle.
    MoyensPaiementModule,
    // RG-PAY-012 : resolution/verification du moyen de paiement CLIENT
    // (numero a debiter), symetrique a MoyensPaiementModule.
    MoyensPaiementClientModule,
  ],
  providers: [PaiementsService, MvolaService],
  controllers: [PaiementsController],
  exports: [PaiementsService],
})
export class PaiementsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facture } from './entities/facture.entity';
import { FactureCompteur } from './entities/facture-compteur.entity';
import { Transaction } from '../paiements/entities/transaction.entity';
import { FacturesService } from './factures.service';
import { FacturesController } from './factures.controller';

/**
 * Facturation des paiements. Depend uniquement des entites (pas de
 * PaiementsModule) : PaiementsModule importe ce module, aucun cycle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Facture, FactureCompteur, Transaction])],
  providers: [FacturesService],
  controllers: [FacturesController],
  exports: [FacturesService],
})
export class FacturesModule {}

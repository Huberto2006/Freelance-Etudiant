import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoyenPaiement } from './entities/moyen-paiement.entity';
import { MoyensPaiementService } from './moyens-paiement.service';
import { MoyensPaiementController } from './moyens-paiement.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MoyenPaiement])],
  providers: [MoyensPaiementService],
  controllers: [MoyensPaiementController],
  // Exporte pour le module Paiements : resolution du moyen attache a une
  // transaction (snapshot) et liste securisee des coordonnees du
  // beneficiaire lorsque le paiement est reellement du.
  exports: [MoyensPaiementService],
})
export class MoyensPaiementModule {}

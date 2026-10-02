import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoyenPaiementClient } from './entities/moyen-paiement-client.entity';
import { MoyensPaiementClientService } from './moyens-paiement-client.service';
import { MoyensPaiementClientController } from './moyens-paiement-client.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MoyenPaiementClient])],
  controllers: [MoyensPaiementClientController],
  providers: [MoyensPaiementClientService],
  exports: [MoyensPaiementClientService],
})
export class MoyensPaiementClientModule {}

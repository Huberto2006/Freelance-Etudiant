import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';
import { CandidaturesModule } from '../candidatures/candidatures.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    CandidaturesModule,
    NotificationsModule,
  ],
  providers: [PaiementsService],
  controllers: [PaiementsController],
  exports: [PaiementsService],
})
export class PaiementsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationsService } from './evaluations.service';
import { EvaluationsController } from './evaluations.controller';
import { LivraisonsModule } from '../livraisons/livraisons.module';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation]),
    LivraisonsModule,
    ReputationModule,
  ],
  providers: [EvaluationsService],
  controllers: [EvaluationsController],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}

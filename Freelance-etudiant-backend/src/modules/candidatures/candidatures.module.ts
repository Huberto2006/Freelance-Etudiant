import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidature } from './entities/candidature.entity';
import { CandidaturesService } from './candidatures.service';
import { CandidaturesController } from './candidatures.controller';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Candidature]), MissionsModule],
  providers: [CandidaturesService],
  controllers: [CandidaturesController],
  exports: [CandidaturesService],
})
export class CandidaturesModule {}

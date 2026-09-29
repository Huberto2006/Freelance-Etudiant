import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { Mission } from '../missions/entities/mission.entity';
import { ServiceOffert } from '../services/entities/service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur, Mission, ServiceOffert]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
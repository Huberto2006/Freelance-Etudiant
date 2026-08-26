import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { Utilisateur } from '../users/entities/utilisateur.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Utilisateur]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
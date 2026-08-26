import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Signalement } from './entities/signalement.entity';
import { SignalementsService } from './signalements.service';
import { SignalementsController } from './signalements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Signalement])],
  providers: [SignalementsService],
  controllers: [SignalementsController],
  exports: [SignalementsService],
})
export class SignalementsModule {}

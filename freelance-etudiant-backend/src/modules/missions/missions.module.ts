import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './entities/mission.entity';
import { MissionsService } from './missions.service';
import { ExpirationMissionsService } from './expiration-missions.service';
import { MissionsController } from './missions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mission]), NotificationsModule],
  providers: [MissionsService, ExpirationMissionsService],
  controllers: [MissionsController],
  exports: [MissionsService],
})
export class MissionsModule {}

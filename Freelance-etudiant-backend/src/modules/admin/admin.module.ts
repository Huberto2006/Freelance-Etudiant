import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [UsersModule, ServicesModule, MissionsModule],
  controllers: [AdminController],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionProfil } from './entities/reaction-profil.entity';
import { ReactionsService } from './reactions.service';
import { ReactionsController } from './reactions.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReactionProfil]),
    UsersModule,
    NotificationsModule,
  ],
  providers: [ReactionsService],
  controllers: [ReactionsController],
})
export class ReactionsModule {}

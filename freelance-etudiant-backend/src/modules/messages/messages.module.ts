import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

import { NotificationsModule } from '../notifications/notifications.module';
import { CandidaturesModule } from '../candidatures/candidatures.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
    ]),

    NotificationsModule,

    CandidaturesModule,

    UsersModule,
  ],

  providers: [
    MessagesService,
  ],

  controllers: [
    MessagesController,
  ],

  exports: [
    MessagesService,
  ],
})
export class MessagesModule {}
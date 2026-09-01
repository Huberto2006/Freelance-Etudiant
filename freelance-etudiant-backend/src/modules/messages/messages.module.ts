import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

import { CandidaturesModule } from '../candidatures/candidatures.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
    ]),

    CandidaturesModule,

    UsersModule,

    RealtimeModule,
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
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Message } from './entities/message.entity';
import { MessageGroupeLecture } from './entities/message-groupe-lecture.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

import { CandidaturesModule } from '../candidatures/candidatures.module';
import { UsersModule } from '../users/users.module';
import { GroupesModule } from '../groupes/groupes.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AmitieModule } from '../amitie/amitie.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      MessageGroupeLecture,
    ]),

    CandidaturesModule,

    UsersModule,

    /*
     * Messagerie de groupe : la verification d'appartenance au groupe est
     * deleguee a GroupesService (les regles de gestion restent dans le
     * module groupes). Aucune dependance circulaire : GroupesModule
     * n'importe pas MessagesModule.
     */
    GroupesModule,

    RealtimeModule,

    AmitieModule,
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
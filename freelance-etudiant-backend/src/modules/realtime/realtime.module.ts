import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RealtimeGateway } from './realtime.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

/**
 * Module partage exposant RealtimeGateway aux autres modules metier
 * (NotificationsModule, MessagesModule) qui souhaitent pousser des
 * evenements temps reel apres une ecriture en base.
 */
@Module({
  imports: [AuthModule, UsersModule],
  providers: [RealtimeGateway, WsJwtGuard],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}

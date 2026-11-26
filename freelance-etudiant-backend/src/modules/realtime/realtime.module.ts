import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { jwtModuleAsyncOptions } from '../../config/jwt.config';
import { RealtimeGateway } from './realtime.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

/**
 * Module partage exposant RealtimeGateway aux autres modules metier
 * (NotificationsModule, MessagesModule) qui souhaitent pousser des
 * evenements temps reel apres une ecriture en base.
 *
 * N'importe pas AuthModule (qui depend indirectement de NotificationsModule
 * via SessionsModule) : WsJwtGuard n'a besoin que de JwtService et UsersService.
 */
@Module({
  imports: [JwtModule.registerAsync(jwtModuleAsyncOptions), UsersModule],
  providers: [RealtimeGateway, WsJwtGuard],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}

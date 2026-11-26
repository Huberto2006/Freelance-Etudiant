import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { TurnstileModule } from '../turnstile/turnstile.module';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { RefreshToken } from './entities/refresh-token.entity';
import { jwtModuleAsyncOptions } from '../../config/jwt.config';

@Module({
  imports: [
    UsersModule,
    SessionsModule,
    TurnstileModule,
    TypeOrmModule.forFeature([RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync(jwtModuleAsyncOptions),
  ],
  providers: [AuthService, JwtStrategy, GoogleTokenVerifierService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

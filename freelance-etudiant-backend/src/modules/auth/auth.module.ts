import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { TurnstileModule } from '../turnstile/turnstile.module';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './entities/refresh-token.entity';
import type { StringValue } from 'ms';
@Module({
  imports: [
    UsersModule,
    TurnstileModule,
    TypeOrmModule.forFeature([RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Aucun secret de repli : jwt.config.ts refuse deja le demarrage
        // si JWT_SECRET est absent.
        const secret = configService.getOrThrow<string>('jwt.secret');
        const expiresIn = configService.get<string>('jwt.expiresIn') ?? '15m';

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as StringValue,
            algorithm: 'HS256' as const,
          },
          verifyOptions: { algorithms: ['HS256' as const] },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleTokenVerifierService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

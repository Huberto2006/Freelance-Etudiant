import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EtudiantsModule } from './modules/etudiants/etudiants.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ServicesModule } from './modules/services/services.module';
import { MissionsModule } from './modules/missions/missions.module';
import { CandidaturesModule } from './modules/candidatures/candidatures.module';
import { LivraisonsModule } from './modules/livraisons/livraisons.module';
import { MessagesModule } from './modules/messages/messages.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { ReputationModule } from './modules/reputation/reputation.module';
import { MatchingModule } from './modules/matching/matching.module';
import { StatistiquesModule } from './modules/statistiques/statistiques.module';
import { SignalementsModule } from './modules/signalements/signalements.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReactionsModule } from './modules/reactions/reactions.module';
import { FavorisModule } from './modules/favoris/favoris.module';
import { PaiementsModule } from './modules/paiements/paiements.module';

import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env'],
    }),
      
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [__dirname + '/modules/**/entities/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        // RG7 : contrainte unique gere au niveau colonne (email) ; les
        // suppressions en cascade sont explicitement definies par entite
        // (onDelete) plutot que par un comportement global implicite.
      }),
    }),

    AuthModule,
    UsersModule,
    EtudiantsModule,
    ClientsModule,
    ServicesModule,
    MissionsModule,
    CandidaturesModule,
    LivraisonsModule,
    MessagesModule,
    EvaluationsModule,
    ReputationModule,
    MatchingModule,
    StatistiquesModule,
    SignalementsModule,
    AdminModule,
    UploadsModule,
    NotificationsModule,
    ReactionsModule,
    FavorisModule,
    PaiementsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Socket } from 'socket.io';
import { AppModule } from './app.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthService } from './modules/auth/auth.service';
import { RealtimeGateway } from './modules/realtime/realtime.gateway';
import { WsJwtGuard } from './modules/realtime/guards/ws-jwt.guard';
import { NotificationsService } from './modules/notifications/notifications.service';
import { SessionsService } from './modules/sessions/sessions.service';
import { UsersService } from './modules/users/users.service';
import { Role } from './common/enums/role.enum';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import googleConfig from './config/google.config';
import turnstileConfig from './config/turnstile.config';

function creerRepositoryMock() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findBy: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => v),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
  };
}

function creerDataSourceMock(): Partial<DataSource> {
  const repo = creerRepositoryMock();
  return {
    isInitialized: true,
    options: { type: 'postgres' } as DataSource['options'],
    entityMetadatas: [],
    getRepository: jest.fn().mockReturnValue(repo) as unknown as DataSource['getRepository'],
    getTreeRepository: jest.fn().mockReturnValue(repo) as unknown as DataSource['getTreeRepository'],
    getMongoRepository: jest.fn().mockReturnValue(repo) as unknown as DataSource['getMongoRepository'],
    query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
}

describe('Bootstrap des modules NestJS (cycle Auth / Sessions / Notifications / Realtime)', () => {
  const envOriginal = { ...process.env };

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DB_USERNAME = process.env.DB_USERNAME || 'test_user';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
    process.env.DB_DATABASE = process.env.DB_DATABASE || 'test_db';
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-super-long-32-chars-minimum';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-super-long-32-chars';
    process.env.TURNSTILE_SECRET_KEY =
      process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  it('compile AuthModule (et la chaine SessionsModule -> NotificationsModule -> RealtimeModule) sans cycle', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [appConfig, databaseConfig, jwtConfig, googleConfig, turnstileConfig],
        }),
        TypeOrmModule.forRootAsync({
          useFactory: () => ({ type: 'postgres' }),
          dataSourceFactory: async () => creerDataSourceMock() as DataSource,
        }),
        AuthModule,
      ],
    }).compile();

    try {
      expect(moduleRef.get(AuthService)).toBeDefined();
      expect(moduleRef.get(SessionsService)).toBeDefined();
      expect(moduleRef.get(NotificationsService)).toBeDefined();
      expect(moduleRef.get(RealtimeGateway)).toBeDefined();
      expect(moduleRef.get(WsJwtGuard)).toBeDefined();
    } finally {
      await moduleRef.close();
    }
  });

  it('compile AppModule complet sans UndefinedModuleException ni cycle bloquant', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(creerDataSourceMock())
      .compile();

    try {
      const wsJwtGuard = moduleRef.get(WsJwtGuard);
      const jwtService = moduleRef.get(JwtService);
      const configService = moduleRef.get(ConfigService);
      const usersService = moduleRef.get(UsersService);

      expect(wsJwtGuard).toBeDefined();
      expect(moduleRef.get(RealtimeGateway)).toBeDefined();
      expect(moduleRef.get(AuthService)).toBeDefined();
      expect(moduleRef.get(SessionsService)).toBeDefined();
      expect(moduleRef.get(NotificationsService)).toBeDefined();

      // Verifie que WsJwtGuard valide bien un access token signe avec jwt.secret
      // et rejette un refresh token ou un utilisateur suspendu.
      const secret = configService.getOrThrow<string>('jwt.secret');
      const accessToken = await jwtService.signAsync(
        {
          sub: 'user-123',
          email: 'etudiant@kianja.mg',
          role: Role.ETUDIANT,
          typ: 'access',
          sid: 'session-1',
        },
        { secret, algorithm: 'HS256' },
      );

      jest.spyOn(usersService, 'findById').mockResolvedValueOnce({
        id: 'user-123',
        email: 'etudiant@kianja.mg',
        role: Role.ETUDIANT,
        estActif: true,
        estSuspendu: false,
      } as Awaited<ReturnType<UsersService['findById']>>);

      const socketValide = {
        id: 'sock-1',
        handshake: { auth: { token: accessToken }, headers: {} },
      } as unknown as Socket;
      await expect(wsJwtGuard.authentifier(socketValide)).resolves.toBe('user-123');

      jest.spyOn(usersService, 'findById').mockResolvedValueOnce({
        id: 'user-123',
        email: 'etudiant@kianja.mg',
        role: Role.ETUDIANT,
        estActif: true,
        estSuspendu: true,
      } as Awaited<ReturnType<UsersService['findById']>>);
      await expect(wsJwtGuard.authentifier(socketValide)).resolves.toBeNull();

      const refreshToken = await jwtService.signAsync(
        {
          sub: 'user-123',
          email: 'etudiant@kianja.mg',
          role: Role.ETUDIANT,
          typ: 'refresh',
          jti: 'jti-1',
          sid: 'session-1',
        },
        { secret, algorithm: 'HS256' },
      );
      const socketRefresh = {
        id: 'sock-2',
        handshake: { auth: { token: refreshToken }, headers: {} },
      } as unknown as Socket;
      await expect(wsJwtGuard.authentifier(socketRefresh)).resolves.toBeNull();

      // Verifie que le verrouillage algorithmique HS256 est preserve sur RealtimeModule.
      const hs512Token = await jwtService.signAsync(
        {
          sub: 'user-123',
          email: 'etudiant@kianja.mg',
          role: Role.ETUDIANT,
          typ: 'access',
          sid: 'session-1',
        },
        { secret, algorithm: 'HS512' },
      );
      const socketHs512 = {
        id: 'sock-3',
        handshake: { auth: { token: hs512Token }, headers: {} },
      } as unknown as Socket;
      await expect(wsJwtGuard.authentifier(socketHs512)).resolves.toBeNull();
    } finally {
      await moduleRef.close();
    }
  });
});

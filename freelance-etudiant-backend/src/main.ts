import { NestFactory, Reflector } from "@nestjs/core";
import {
  ValidationPipe,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SwaggerModule,
  DocumentBuilder,
} from "@nestjs/swagger";
import helmet from "helmet";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(AppModule, {
      // Conserve le corps brut des requetes (req.rawBody) : indispensable
      // pour verifier la signature HMAC des webhooks de paiement.
      rawBody: true,
    });

  const configService = app.get(ConfigService);

  // Deux proxies en production : Nginx hote puis gateway Docker. Sans cela,
  // le rate limiting confondrait tous les visiteurs avec l'IP du gateway.
  const trustProxyHops = configService.get<string>("TRUST_PROXY_HOPS");
  if (trustProxyHops) {
    const hops = Number(trustProxyHops);
    if (!Number.isInteger(hops) || hops < 1) {
      throw new Error("TRUST_PROXY_HOPS doit etre un entier positif");
    }
    app.set("trust proxy", hops);
  }
  app.enableShutdownHooks();

  // helmet AVANT toute route/statique : ses en-tetes (nosniff, HSTS,
  // frameguard...) s'appliquent aussi aux fichiers servis. La politique
  // cross-origin des ressources reste ouverte car le front (autre origine
  // possible) affiche les images publiques.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  /*
   * Fichiers statiques PUBLICS : uniquement les photos de profil et les
   * images de missions/services (affichees sur des pages publiques).
   * Les DOCUMENTS (livrables, pieces jointes, cahiers des charges) ne sont
   * plus exposes ici : ils passent par un lien signe de 60 s delivre apres
   * controle d'acces (voir UploadsController). Exemple :
   * uploads/profiles/photo.jpg -> /uploads/profiles/photo.jpg
   */
  for (const dossier of ['profiles', 'images']) {
    app.useStaticAssets(join(process.cwd(), 'uploads', dossier), {
      prefix: `/uploads/${dossier}/`,
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => {
        // Empeche le navigateur de deviner un autre type que celui declare
        // et interdit toute execution de contenu actif dans ces fichiers.
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        );
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    });
  }

  app.enableCors({
    origin: configService.get<string[]>('app.corsOrigin'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Kianja-Csrf',
      'X-Turnstile-Token',
    ],
    maxAge: 600,
  });

  const apiPrefix =
    configService.get<string>("app.apiPrefix") || "api/v1";

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(
      app.get(Reflector),
    ),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
  );

  // Swagger uniquement hors production
  const nodeEnv =
    configService.get<string>("app.nodeEnv");

  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(
        "Plateforme Freelance Etudiants - API",
      )
      .setDescription(
        "API REST de la plateforme de mise en relation entre étudiants freelances et clients",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document =
      SwaggerModule.createDocument(
        app,
        swaggerConfig,
      );

    SwaggerModule.setup(
      "docs",
      app,
      document,
    );
  }

  const port =
    configService.get<number>("app.port") || 3000;

  await app.listen(port, "0.0.0.0");

  console.log(
    `API demarree sur http://localhost:${port}/${apiPrefix}`,
  );

  console.log(
    `Images publiques disponibles sur http://localhost:${port}/uploads/(profiles|images)/`,
  );

  if (nodeEnv !== "production") {
    console.log(
      `Documentation Swagger : http://localhost:${port}/docs`,
    );
  }
}

bootstrap();

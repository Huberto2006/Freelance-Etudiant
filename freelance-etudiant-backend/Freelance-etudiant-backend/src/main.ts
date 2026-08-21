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
    await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  /*
   * Fichiers statiques
   *
   * Exemple :
   * uploads/profiles/photo.jpg
   *
   * sera accessible avec :
   * /uploads/profiles/photo.jpg
   */
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
  });

  app.use(helmet());

  app.enableCors({
    origin: configService.get<string>("app.corsOrigin"),
    credentials: true,
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

  await app.listen(port);

  console.log(
    `API demarree sur http://localhost:${port}/${apiPrefix}`,
  );

  console.log(
    `Fichiers uploads disponibles sur http://localhost:${port}/uploads/`,
  );

  if (nodeEnv !== "production") {
    console.log(
      `Documentation Swagger : http://localhost:${port}/docs`,
    );
  }
}

bootstrap();
import { registerAs } from '@nestjs/config';

/**
 * Connexion PostgreSQL. Aucun identifiant n'est code en dur : les
 * variables DB_USERNAME, DB_PASSWORD et DB_DATABASE doivent etre fournies
 * par l'environnement (.env).
 */
export default registerAs('database', () => {
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_DATABASE;

  if (!username || !password || !database) {
    throw new Error(
      'DB_USERNAME, DB_PASSWORD et DB_DATABASE sont obligatoires dans .env (aucune valeur par defaut n\'est fournie).',
    );
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username,
    password,
    database,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  };
});

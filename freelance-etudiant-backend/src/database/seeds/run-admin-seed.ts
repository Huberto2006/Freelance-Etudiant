import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { seedAdmin } from './admin.seed';

async function runAdminSeed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const result = await seedAdmin(app.get(UsersService));
    const action = result.created ? 'créé' : 'synchronisé';
    console.log(`Compte administrateur ${action} : ${result.email}`);
  } finally {
    await app.close();
  }
}

runAdminSeed().catch((error) => {
  console.error('Erreur lors de la création du compte administrateur :', error);
  process.exit(1);
});

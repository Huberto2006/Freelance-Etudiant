import { Global, Module } from '@nestjs/common';
import { EmailsService } from './emails.service';

/**
 * Module d'emails transactionnels Kianja.
 * Déclaré @Global pour permettre une injection directe et découplée
 * dans les modules métier (Candidatures, Missions, etc.) sans dépendre
 * du module de notifications internes.
 */
@Global()
@Module({
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}

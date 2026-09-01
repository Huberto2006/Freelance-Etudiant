import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Module global d'envoi d'emails. Declare @Global pour que les modules
 * metier (auth, paiements...) puissent injecter EmailService sans
 * re-importer le module partout.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

/**
 * Formulaire de contact public. EmailService (module global) et
 * ConfigService (ConfigModule global) sont injectes sans import
 * explicite.
 */
@Module({
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}

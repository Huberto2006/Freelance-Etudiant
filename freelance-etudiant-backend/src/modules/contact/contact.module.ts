import { Module } from '@nestjs/common';
import { TurnstileModule } from '../turnstile/turnstile.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

/**
 * Formulaire de contact public. EmailService (module global) et
 * ConfigService (ConfigModule global) sont injectes sans import
 * explicite.
 */
@Module({
  imports: [TurnstileModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}

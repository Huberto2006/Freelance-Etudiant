import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { TurnstileGuard } from '../turnstile/turnstile.guard';
import { TurnstileActions } from '../turnstile/turnstile-action.decorator';
import { ContactService } from './contact.service';
import { EnvoyerMessageContactDto } from './dto/envoyer-message-contact.dto';

// Route publique et donc abusable : 3 messages par minute et par IP
// (meme calibrage que les envois d'e-mails d'authentification).
const LIMITE_CONTACT = { default: { limit: 3, ttl: 60000 } };

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Throttle(LIMITE_CONTACT)
  @UseGuards(TurnstileGuard)
  @TurnstileActions('contact')
  @HttpCode(200)
  @Post()
  @ApiOperation({
    summary:
      "Envoyer un message a l'equipe Kianja (formulaire de contact public)",
  })
  async envoyer(@Body() dto: EnvoyerMessageContactDto) {
    return this.contactService.envoyer(dto);
  }
}

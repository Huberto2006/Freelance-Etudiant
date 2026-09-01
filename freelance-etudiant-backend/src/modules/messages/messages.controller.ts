import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Messagerie')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Envoyer un message a un autre utilisateur' })
  async envoyer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EnvoyerMessageDto,
  ) {
    return this.messagesService.envoyer(user.id, dto);
  }

  @Get('non-lus/compteur')
  @ApiOperation({ summary: 'Compter mes messages non lus' })
  async compteur(@CurrentUser() user: AuthenticatedUser) {
    const total = await this.messagesService.compterNonLus(user.id);
    return { total };
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes conversations' })
  async mesConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.findMesConversations(user.id);
  }

  @Get('conversation/:autreUtilisateurId')
  @ApiOperation({ summary: 'Consulter une conversation avec un utilisateur donne' })
  async conversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('autreUtilisateurId') autreUtilisateurId: string,
  ) {
    return this.messagesService.findConversation(user.id, autreUtilisateurId);
  }

  @Patch(':id/lu')
  @ApiOperation({ summary: 'Marquer un message comme lu' })
  async marquerLu(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.messagesService.marquerCommeLu(id, user.id);
    return { message: 'Message marque comme lu' };
  }
}

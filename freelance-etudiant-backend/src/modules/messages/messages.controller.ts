import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';
import { EnvoyerMessageGroupeDto } from './dto/envoyer-message-groupe.dto';
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

  /**
   * Message de groupe : groupeId vient du parametre de route.
   * Seuls les membres du groupe peuvent envoyer.
   */
  @Post('groupes/:groupeId')
  @ApiOperation({ summary: "Envoyer un message a un groupe dont je suis membre" })
  async envoyerAuGroupe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('groupeId') groupeId: string,
    @Body() dto: EnvoyerMessageGroupeDto,
  ) {
    return this.messagesService.envoyerAuGroupe(user.id, groupeId, dto);
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

  /**
   * Conversation de groupe : reservee aux membres du groupe, messages
   * dans l'ordre chronologique.
   */
  @Get('groupes/:groupeId')
  @ApiOperation({ summary: "Consulter la conversation d'un groupe dont je suis membre" })
  async conversationGroupe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('groupeId') groupeId: string,
  ) {
    return this.messagesService.findConversationGroupe(user.id, groupeId);
  }

  /**
   * Marque comme lus les messages du groupe pour l'utilisateur connecte.
   */
  @Patch('groupes/:groupeId/lu')
  @ApiOperation({ summary: "Marquer comme lus les messages d'un groupe" })
  async marquerGroupeLu(
    @CurrentUser() user: AuthenticatedUser,
    @Param('groupeId') groupeId: string,
  ) {
    const total = await this.messagesService.marquerMessagesGroupeCommeLus(
      user.id,
      groupeId,
    );

    return {
      message: 'Messages du groupe marques comme lus',
      total,
    };
  }

  @Patch(':id/lu')
  @ApiOperation({ summary: 'Marquer un message comme lu' })
  async marquerLu(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.messagesService.marquerCommeLu(id, user.id);
    return { message: 'Message marque comme lu' };
  }

  /**
   * Suppression LOGIQUE d'un message : seuls l'expediteur du message peut
   * le supprimer (verification cote backend). Le contenu est masque pour
   * tous, l'historique de la conversation est conserve.
   */
  @Delete(':id')
  @ApiOperation({ summary: "Supprimer un de mes messages (l'expediteur uniquement)" })
  async supprimer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.messagesService.supprimer(id, user.id);
    return { message: 'Message supprime' };
  }
}

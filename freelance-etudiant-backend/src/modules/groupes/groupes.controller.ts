import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { GroupesService } from './groupes.service';
import { CreerGroupeDto } from './dto/creer-groupe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { InviterEtudiantDto } from './dto/inviter-etudiant.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('groupes')
@UseGuards(JwtAuthGuard)
export class GroupesController {
  constructor(
    private readonly groupesService: GroupesService,
  ) { }

  @Post()
  async creer(
    @Body() dto: CreerGroupeDto,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.groupesService.creer(dto, request.user);
  }

  @Get('mes-groupes')
  async mesGroupes(
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.groupesService.findMesGroupes(request.user);
  }

  @Get('invitations/:invitationId')
  async trouverInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.trouverInvitation(
      invitationId,
      user,
    );
  }

  @Get(':id')
  async trouver(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.findOne(id, user.id);
  }

  @Post(':id/quitter')
  async quitter(
    @Param('id') groupeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.groupesService.quitter(groupeId, user);
    return { message: 'Vous avez quitté le groupe.' };
  }

  @Delete(':id/membres/:etudiantId')
  async retirerMembre(
    @Param('id') groupeId: string,
    @Param('etudiantId') etudiantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.groupesService.retirerMembre(groupeId, etudiantId, user);
    return { message: 'Membre retiré du groupe.' };
  }

  @Patch(':id/chef')
  async transfererChef(
    @Param('id') groupeId: string,
    @Body('etudiantId') etudiantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.transfererChef(groupeId, etudiantId, user);
  }

  @Post(':id/invitations')
  async inviter(
    @Param('id') groupeId: string,
    @Body() dto: InviterEtudiantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.inviter(
      groupeId,
      dto,
      user,
    );
  }

  @Get(':id/invitations')
  async invitationsDuGroupe(
    @Param('id') groupeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.trouverInvitationsPourChef(groupeId, user);
  }

  @Post('invitations/:invitationId/accepter')
  async accepterInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.accepterInvitation(
      invitationId,
      user,
    );
  }

  @Post('invitations/:invitationId/refuser')
  async refuserInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.refuserInvitation(
      invitationId,
      user,
    );
  }

  @Delete('invitations/:invitationId')
  async annulerInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupesService.annulerInvitation(invitationId, user);
  }
}
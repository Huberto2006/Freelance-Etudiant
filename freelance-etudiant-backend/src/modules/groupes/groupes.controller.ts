import {
  Body,
  Controller,
  Get,
  Param,
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

  @Get(':id')
  async trouver(
    @Param('id') id: string,
  ) {
    return this.groupesService.findOne(id);
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
}
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReactionsService } from './reactions.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';

@ApiTags('Réactions de profil')
@Controller('utilisateurs/:id/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Public()
  @UseGuards(OptionalAuthGuard)
  @Get()
  @ApiOperation({ summary: "Consulter le nombre de reactions d'un profil" })
  async info(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.reactionsService.getInfo(id, user?.id);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Reagir / retirer sa reaction sur un profil' })
  async toggle(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reactionsService.toggle(user.id, id);
  }
}

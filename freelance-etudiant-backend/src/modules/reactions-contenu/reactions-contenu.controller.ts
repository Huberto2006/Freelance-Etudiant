import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReactionsContenuService } from './reactions-contenu.service';
import { ReagirDto } from './dto/reagir.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';

@ApiTags('Réactions sur contenu')
@Controller('reactions-contenu')
export class ReactionsContenuController {
  constructor(private readonly reactionsContenuService: ReactionsContenuService) {}

  @Public()
  @UseGuards(OptionalAuthGuard)
  @Get()
  @ApiOperation({ summary: "Compteurs 👍/👎 d'un contenu (+ ma reaction si connecte)" })
  async getInfo(
    @Query('cibleType') cibleType: TypeCibleContenu,
    @Query('cibleId') cibleId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.reactionsContenuService.getInfo(cibleType, cibleId, user?.id);
  }

  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Réagir (👍/👎), changer ou retirer sa réaction' })
  async reagir(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReagirDto) {
    return this.reactionsContenuService.reagir(user.id, dto);
  }
}

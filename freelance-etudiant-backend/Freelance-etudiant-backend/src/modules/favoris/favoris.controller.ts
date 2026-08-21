import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FavorisService } from './favoris.service';
import { ToggleFavoriDto } from './dto/toggle-favori.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TypeCibleFavori } from '../../common/enums/type-cible-favori.enum';

@ApiTags('Favoris')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('favoris')
export class FavorisController {
  constructor(private readonly favorisService: FavorisService) {}

  @Post()
  @ApiOperation({ summary: 'Ajouter/retirer une mission, un service ou un etudiant de mes favoris' })
  async toggle(@CurrentUser() user: AuthenticatedUser, @Body() dto: ToggleFavoriDto) {
    return this.favorisService.toggle(user.id, dto.cibleType, dto.cibleId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes favoris (filtrable par type)' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cibleType') cibleType?: TypeCibleFavori,
  ) {
    return this.favorisService.findByUser(user.id, cibleType);
  }
}

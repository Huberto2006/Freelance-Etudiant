import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentairesService } from './commentaires.service';
import { CreerCommentaireDto, ModifierCommentaireDto } from './dto/commentaire.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Public } from '../../common/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TypeCibleContenu } from '../../common/enums/type-cible-contenu.enum';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Commentaires')
@Controller('commentaires')
export class CommentairesController {
  constructor(private readonly commentairesService: CommentairesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Lister les commentaires d'une mission ou d'un service" })
  async findByCible(
    @Query('cibleType') cibleType: TypeCibleContenu,
    @Query('cibleId') cibleId: string,
  ) {
    return this.commentairesService.findByCible(cibleType, cibleId);
  }

  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Ajouter un commentaire' })
  async creer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerCommentaireDto,
  ) {
    return this.commentairesService.creer(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier mon propre commentaire' })
  async modifier(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ModifierCommentaireDto,
  ) {
    return this.commentairesService.modifier(id, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer mon propre commentaire (ou moderation admin)' })
  async supprimer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.commentairesService.supprimer(id, user.id, user.role === Role.ADMIN);
    return { message: 'Commentaire supprimé' };
  }
}

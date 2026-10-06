import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Consulter son propre profil client' })
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.clientsService.findByUtilisateurId(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Mettre a jour son propre profil client' })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.clientsService.update(user.id, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Consulter la fiche publique d'un client" })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const profil = await this.clientsService.findByUtilisateurId(id);

    /*
     * Fiche publique en LISTE BLANCHE : seuls les champs ci-dessous sont
     * exposes. Tout futur champ ajoute a ClientProfile (telephone, budgets,
     * besoins...) reste prive par defaut, contrairement a un destructuring
     * qui retire seulement les champs connus.
     */
    return {
      utilisateurId: profil.utilisateurId,
      typeClient: profil.typeClient,
      nomEntreprise: profil.nomEntreprise,
      secteurActivite: profil.secteurActivite,
      description: profil.description,
      ville: profil.ville,
      siteWeb: profil.siteWeb,
      nombreProjets: profil.nombreProjets,
      utilisateur: profil.utilisateur
        ? {
            id: profil.utilisateur.id,
            nom: profil.utilisateur.nom,
            role: profil.utilisateur.role,
            photoUrl: profil.utilisateur.photoUrl,
          }
        : undefined,
    };
  }
}


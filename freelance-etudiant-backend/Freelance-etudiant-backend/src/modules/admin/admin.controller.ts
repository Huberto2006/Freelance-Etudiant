import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { ServicesService } from '../services/services.service';
import { MissionsService } from '../missions/missions.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

/**
 * Fonctionnalites Administrateur (2.3 du cahier des charges) :
 *  - Gestion des utilisateurs : activation, suspension, suppression.
 *  - Moderation du contenu : services et missions.
 * RG9 : l'admin ne peut jamais publier de mission ni de service (aucune
 * route de creation n'est exposee ici, uniquement de la moderation).
 */
@ApiTags('Administration')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly servicesService: ServicesService,
    private readonly missionsService: MissionsService,
  ) {}

  @Get('utilisateurs')
  @ApiOperation({ summary: 'Lister tous les utilisateurs (filtrable par role)' })
  async listerUtilisateurs(@Query('role') role?: Role) {
    return this.usersService.findAll(role);
  }

  @Patch('utilisateurs/:id/suspendre')
  @ApiOperation({ summary: 'Suspendre un compte utilisateur' })
  async suspendre(@Param('id') id: string) {
    return this.usersService.setSuspendu(id, true);
  }

  @Patch('utilisateurs/:id/reactiver')
  @ApiOperation({ summary: 'Lever la suspension d\'un compte utilisateur' })
  async reactiver(@Param('id') id: string) {
    return this.usersService.setSuspendu(id, false);
  }

  @Patch('utilisateurs/:id/desactiver')
  @ApiOperation({ summary: 'Desactiver un compte utilisateur' })
  async desactiver(@Param('id') id: string) {
    return this.usersService.setActif(id, false);
  }

  @Patch('utilisateurs/:id/activer')
  @ApiOperation({ summary: 'Activer un compte utilisateur' })
  async activer(@Param('id') id: string) {
    return this.usersService.setActif(id, true);
  }

  @Delete('utilisateurs/:id')
  @ApiOperation({ summary: 'Supprimer definitivement un compte utilisateur' })
  async supprimer(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'Utilisateur supprime' };
  }

  @Patch('services/:id/approuver')
  @ApiOperation({ summary: 'Approuver un service en attente de moderation' })
  async approuverService(@Param('id') id: string) {
    return this.servicesService.setModeration(id, true);
  }

  @Patch('services/:id/rejeter')
  @ApiOperation({ summary: 'Rejeter/masquer un service' })
  async rejeterService(@Param('id') id: string) {
    return this.servicesService.setModeration(id, false);
  }

  @Patch('missions/:id/approuver')
  @ApiOperation({ summary: 'Approuver une mission en attente de moderation' })
  async approuverMission(@Param('id') id: string) {
    return this.missionsService.setModeration(id, true);
  }

  @Patch('missions/:id/rejeter')
  @ApiOperation({ summary: 'Rejeter/masquer une mission' })
  async rejeterMission(@Param('id') id: string) {
    return this.missionsService.setModeration(id, false);
  }
}

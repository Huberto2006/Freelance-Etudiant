import {
  Controller,
  Delete,
  ForbiddenException,
  Logger,
  NotFoundException,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

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
  private readonly logger = new Logger('AdminAudit');

    /** Journal d'audit des actions sensibles (qui, quoi, sur qui). */
  private audit(admin: AuthenticatedUser, action: string, cible: string) {
    this.logger.warn(`admin=${admin.id} (${admin.email}) action=${action} cible=${cible}`);
  }

  /**
   * Garde-fou : un administrateur ne peut ni se suspendre/desactiver/
   * supprimer lui-meme, ni agir sur un autre administrateur. Un compte
   * admin compromis ne peut donc pas verrouiller les autres admins ni
   * detruire leurs comptes ; ces operations restent possibles en base.
   */
  private async garderCompteSensible(admin: AuthenticatedUser, id: string) {
    const cible = await this.usersService.findById(id);
    if (!cible) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    if (cible.id === admin.id) {
      throw new ForbiddenException('Vous ne pouvez pas agir sur votre propre compte');
    }
    if (cible.role === Role.ADMIN) {
      throw new ForbiddenException('Un compte administrateur ne peut pas etre modifie depuis cette interface');
    }
  }

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
  async suspendre(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    await this.garderCompteSensible(admin, id);
    this.audit(admin, 'suspendre', id);
    return this.usersService.setSuspendu(id, true);
  }

  @Patch('utilisateurs/:id/reactiver')
  @ApiOperation({ summary: 'Lever la suspension d\'un compte utilisateur' })
  async reactiver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    this.audit(admin, 'reactiver', id);
    return this.usersService.setSuspendu(id, false);
  }

  @Patch('utilisateurs/:id/desactiver')
  @ApiOperation({ summary: 'Desactiver un compte utilisateur' })
  async desactiver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    await this.garderCompteSensible(admin, id);
    this.audit(admin, 'desactiver', id);
    return this.usersService.setActif(id, false);
  }

  @Patch('utilisateurs/:id/activer')
  @ApiOperation({ summary: 'Activer un compte utilisateur' })
  async activer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    this.audit(admin, 'activer', id);
    return this.usersService.setActif(id, true);
  }

  @Delete('utilisateurs/:id')
  @ApiOperation({ summary: 'Supprimer definitivement un compte utilisateur' })
  async supprimer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    await this.garderCompteSensible(admin, id);
    this.audit(admin, 'supprimer', id);
    await this.usersService.remove(id);
    return { message: 'Utilisateur supprime' };
  }

  @Patch('services/:id/approuver')
  @ApiOperation({ summary: 'Approuver un service en attente de moderation' })
  async approuverService(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    this.audit(admin, 'service.approuver', id);
    return this.servicesService.setModeration(id, true);
  }

  @Patch('services/:id/rejeter')
  @ApiOperation({ summary: 'Rejeter/masquer un service' })
  async rejeterService(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    this.audit(admin, 'service.rejeter', id);
    return this.servicesService.setModeration(id, false);
  }

  @Patch('missions/:id/approuver')
  @ApiOperation({ summary: 'Approuver une mission en attente de moderation' })
  async approuverMission(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    this.audit(admin, 'mission.approuver', id);
    return this.missionsService.setModeration(id, true);
  }

  @Patch('missions/:id/rejeter')
  @ApiOperation({ summary: 'Rejeter/masquer une mission' })
  async rejeterMission(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    this.audit(admin, 'mission.rejeter', id);
    return this.missionsService.setModeration(id, false);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DemandesServiceService } from './demandes-service.service';
import { CreerDemandeServiceDto } from './dto/creer-demande-service.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Demandes de service')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class DemandesServiceController {
  constructor(private readonly demandesServiceService: DemandesServiceService) {}

  @Roles(Role.CLIENT)
  @Post('services/:serviceId/demandes')
  @ApiOperation({ summary: 'Commander un service avec un cahier des charges' })
  async creer(
    @Param('serviceId') serviceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerDemandeServiceDto,
  ) {
    return this.demandesServiceService.creer(serviceId, user.id, dto);
  }

  @Roles(Role.CLIENT)
  @Get('demandes-service/me')
  @ApiOperation({ summary: 'Lister mes demandes de service envoyees' })
  async mesDemandes(@CurrentUser() user: AuthenticatedUser) {
    return this.demandesServiceService.findByClient(user.id);
  }

  @Roles(Role.ETUDIANT)
  @Get('demandes-service/recues')
  @ApiOperation({ summary: 'Lister les demandes recues sur mes services' })
  async demandesRecues(@CurrentUser() user: AuthenticatedUser) {
    return this.demandesServiceService.findByEtudiant(user.id);
  }

  @Get('demandes-service/:id')
  @ApiOperation({ summary: 'Consulter une demande de service (client, etudiant fournisseur ou admin)' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.demandesServiceService.findOnePourUtilisateur(id, user);
  }

  @Roles(Role.ETUDIANT)
  @Patch('demandes-service/:id/accepter')
  @ApiOperation({ summary: 'Accepter une demande de service (genere une mission privee)' })
  async accepter(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.demandesServiceService.accepter(id, user.id);
  }

  @Roles(Role.ETUDIANT)
  @Patch('demandes-service/:id/refuser')
  @ApiOperation({ summary: 'Refuser une demande de service' })
  async refuser(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.demandesServiceService.refuser(id, user.id);
  }
}

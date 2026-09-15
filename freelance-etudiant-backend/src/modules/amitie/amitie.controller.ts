import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AmitieService } from './amitie.service';
import { EnvoyerDemandeAmitieDto } from './dto/envoyer-demande-amitie.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/**
 * Routes reservees aux etudiants : les regles de role sont verifiees
 * dans AmitieService (convention des modules groupes et messages,
 * aucun guard Roles n'existant dans le projet).
 */
@ApiTags('Amitiés')
@ApiBearerAuth()
@Controller('amities')
@UseGuards(JwtAuthGuard)
export class AmitieController {
  constructor(private readonly amitieService: AmitieService) {}

  /**
   * Envoyer une demande d'amitie. Le demandeur est l'utilisateur connecte,
   * jamais lu dans le body.
   */
  @Post('demandes')
  @ApiOperation({ summary: "Envoyer une demande d'amitié à un autre étudiant" })
  async envoyerDemande(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EnvoyerDemandeAmitieDto,
  ) {
    return this.amitieService.envoyerDemande(dto, user);
  }

  @Get('demandes/recues')
  @ApiOperation({ summary: "Lister les demandes d'amitié reçues" })
  async demandesRecues(@CurrentUser() user: AuthenticatedUser) {
    return this.amitieService.findDemandesRecues(user);
  }

  @Get('demandes/envoyees')
  @ApiOperation({ summary: "Lister les demandes d'amitié envoyées" })
  async demandesEnvoyees(@CurrentUser() user: AuthenticatedUser) {
    return this.amitieService.findDemandesEnvoyees(user);
  }

  /**
   * Seul le receveur peut accepter une demande (verification cote service).
   * Aucun body : l'identifiant de la demande est dans l'URL.
   */
  @Post('demandes/:id/accepter')
  @ApiOperation({ summary: "Accepter une demande d'amitié reçue" })
  async accepter(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.amitieService.accepter(id, user);
  }

  /**
   * Seul le receveur peut refuser une demande (verification cote service).
   * Une demande refusee n'est pas une amitie.
   */
  @Post('demandes/:id/refuser')
  @ApiOperation({ summary: "Refuser une demande d'amitié reçue" })
  async refuser(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.amitieService.refuser(id, user);
  }

  /**
   * Liste des amis : uniquement les relations acceptees, dans les deux
   * directions (A a demande a B, ou B a demande a A).
   */
  @Get()
  @ApiOperation({ summary: 'Lister mes amis' })
  async mesAmis(@CurrentUser() user: AuthenticatedUser) {
    return this.amitieService.findMesAmis(user);
  }

  /**
   * Retirer un ami : supprime UNIQUEMENT la relation d'amitie.
   * Les messages, groupes, candidatures et missions ne sont jamais touches.
   */
  @Delete(':etudiantId')
  @ApiOperation({ summary: "Retirer un étudiant de mes amis" })
  async retirerAmi(
    @Param('etudiantId') etudiantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.amitieService.retirer(etudiantId, user);
    return { message: 'Amitié supprimée' };
  }
}

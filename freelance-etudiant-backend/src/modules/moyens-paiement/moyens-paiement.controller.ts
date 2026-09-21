import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MoyensPaiementService } from './moyens-paiement.service';
import { CreateMoyenPaiementDto } from './dto/create-moyen-paiement.dto';
import { UpdateMoyenPaiementDto } from './dto/update-moyen-paiement.dto';
import { DefinirActifDto } from './dto/definir-actif.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

/**
 * RG-PAY-010 : les coordonnees de paiement d'un etudiant sont PRIVEES.
 * Toutes les routes de ce module sont reservees a l'etudiant connecte
 * (JWT global + @Roles(ETUDIANT) + controle de propriete dans le
 * service). Aucune route publique n'existe ; le client n'accede aux
 * coordonnees QUE via les routes securisees du module Paiements
 * (GET /candidatures/:id/moyens-paiement, GET /paiements/:id/moyens-paiement).
 */
@ApiTags('Moyens de paiement')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('moyens-paiement')
export class MoyensPaiementController {
  constructor(
    private readonly moyensPaiementService: MoyensPaiementService,
  ) {}

  @Roles(Role.ETUDIANT)
  @Get()
  @ApiOperation({
    summary:
      "Lister mes moyens de paiement (MVola, Orange Money, Airtel Money, compte bancaire)",
  })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.moyensPaiementService.findMine(user.id);
  }

  @Roles(Role.ETUDIANT)
  @Post()
  @ApiOperation({
    summary:
      "Enregistrer un nouveau moyen de paiement (etudiantId toujours deduit de l'utilisateur connecte)",
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMoyenPaiementDto,
  ) {
    return this.moyensPaiementService.create(user.id, dto);
  }

  @Roles(Role.ETUDIANT)
  @Get(':id')
  @ApiOperation({ summary: "Detail d'un de mes moyens de paiement" })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.moyensPaiementService.findOne(id, user.id);
  }

  @Roles(Role.ETUDIANT)
  @Patch(':id')
  @ApiOperation({ summary: "Modifier un de mes moyens de paiement" })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMoyenPaiementDto,
  ) {
    return this.moyensPaiementService.update(id, user.id, dto);
  }

  @Roles(Role.ETUDIANT)
  @Delete(':id')
  @ApiOperation({
    summary:
      "Supprimer un de mes moyens de paiement (refuse s'il est reference par un paiement : desactivez-le)",
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.moyensPaiementService.remove(id, user.id);
    return { message: 'Moyen de paiement supprime' };
  }

  @Roles(Role.ETUDIANT)
  @Patch(':id/principal')
  @ApiOperation({
    summary:
      'Definir un moyen comme principal (les autres moyens passent automatiquement principal = false)',
  })
  async definirPrincipal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.moyensPaiementService.setPrincipal(id, user.id);
  }

  @Roles(Role.ETUDIANT)
  @Patch(':id/actif')
  @ApiOperation({
    summary:
      'Activer ou desactiver un moyen (un moyen desactive ne peut plus servir a un nouveau paiement)',
  })
  async definirActif(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirActifDto,
  ) {
    return this.moyensPaiementService.setActif(id, user.id, dto.actif);
  }
}

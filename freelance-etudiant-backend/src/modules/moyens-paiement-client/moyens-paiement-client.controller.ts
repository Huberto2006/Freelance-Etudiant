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
import { MoyensPaiementClientService } from './moyens-paiement-client.service';
import { CreateMoyenPaiementClientDto } from './dto/create-moyen-paiement-client.dto';
import { UpdateMoyenPaiementClientDto } from './dto/update-moyen-paiement-client.dto';
import { SetActifMoyenPaiementClientDto } from './dto/set-actif.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

/**
 * RG-PAY-012 : moyens de paiement du CLIENT (numeros Mobile Money
 * reutilisables pour payer). Symetrique a /moyens-paiement cote
 * etudiant — memes garanties : toutes les routes sont reservees au
 * client connecte (JWT + @Roles(CLIENT) + controle de propriete dans
 * le service), aucune route publique.
 */
@ApiTags('Moyens de paiement client')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('moyens-paiement-client')
export class MoyensPaiementClientController {
  constructor(
    private readonly service: MoyensPaiementClientService,
  ) {}

  @Roles(Role.CLIENT)
  @Get()
  @ApiOperation({ summary: 'Lister mes moyens de paiement (Mobile Money)' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user.id);
  }

  @Roles(Role.CLIENT)
  @Post()
  @ApiOperation({ summary: 'Enregistrer un nouveau moyen de paiement' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMoyenPaiementClientDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Roles(Role.CLIENT)
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un de mes moyens de paiement' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMoyenPaiementClientDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Roles(Role.CLIENT)
  @Delete(':id')
  @ApiOperation({
    summary:
      "Supprimer un de mes moyens de paiement (refusé s'il est référencé par un paiement : désactivez-le)",
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.remove(id, user.id);
    return { message: 'Moyen de paiement supprimé' };
  }

  @Roles(Role.CLIENT)
  @Patch(':id/principal')
  @ApiOperation({ summary: 'Définir un moyen comme principal' })
  async definirPrincipal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.setPrincipal(id, user.id);
  }

  @Roles(Role.CLIENT)
  @Patch(':id/actif')
  @ApiOperation({ summary: 'Activer ou désactiver un moyen' })
  async definirActif(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActifMoyenPaiementClientDto,
  ) {
    return this.service.setActif(id, user.id, dto.actif);
  }
}

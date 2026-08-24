import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaiementsService } from './paiements.service';
import { CreerPaiementDto } from './dto/creer-paiement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { StatutTransaction } from '../../common/enums/statut-transaction.enum';

@ApiTags('Paiements')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class PaiementsController {
  constructor(private readonly paiementsService: PaiementsService) {}

  @Roles(Role.CLIENT)
  @Post('candidatures/:candidatureId/paiement')
  @ApiOperation({ summary: 'Declarer le paiement d\'une candidature acceptee' })
  async creer(
    @Param('candidatureId') candidatureId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerPaiementDto,
  ) {
    return this.paiementsService.creer(candidatureId, user.id, dto);
  }

  @Roles(Role.CLIENT)
  @Get('paiements/me')
  @ApiOperation({ summary: 'Historique de mes paiements envoyes' })
  async mesPaiements(@CurrentUser() user: AuthenticatedUser) {
    return this.paiementsService.findByClient(user.id);
  }

  @Roles(Role.ETUDIANT)
  @Get('paiements/recus')
  @ApiOperation({ summary: 'Historique des paiements recus' })
  async paiementsRecus(@CurrentUser() user: AuthenticatedUser) {
    return this.paiementsService.findByEtudiant(user.id);
  }

  @Roles(Role.ADMIN)
  @Get('paiements')
  @ApiOperation({ summary: 'Lister tous les paiements (filtrable par statut)' })
  async findAll(@Query('statut') statut?: StatutTransaction) {
    return this.paiementsService.findAll(statut);
  }

  @Roles(Role.ADMIN)
  @Patch('paiements/:id/confirmer')
  @ApiOperation({ summary: 'Confirmer la reception effective des fonds' })
  async confirmer(@Param('id') id: string) {
    return this.paiementsService.confirmer(id);
  }

  @Roles(Role.ADMIN)
  @Patch('paiements/:id/annuler')
  @ApiOperation({ summary: 'Annuler un paiement declare a tort' })
  async annuler(@Param('id') id: string) {
    return this.paiementsService.annuler(id);
  }
}

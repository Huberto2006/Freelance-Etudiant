import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FacturesService } from './factures.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Factures')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class FacturesController {
  constructor(private readonly facturesService: FacturesService) {}

  @Roles(Role.CLIENT, Role.ETUDIANT, Role.ADMIN)
  @Get('factures')
  @ApiOperation({ summary: 'Lister mes factures (admin : toutes)' })
  lister(@CurrentUser() user: AuthenticatedUser) {
    return this.facturesService.lister(user);
  }

  @Roles(Role.CLIENT, Role.ETUDIANT, Role.ADMIN)
  @Get('factures/:id')
  @ApiOperation({ summary: "Detail d'une facture" })
  trouver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facturesService.trouver(id, user);
  }

  @Roles(Role.CLIENT, Role.ETUDIANT, Role.ADMIN)
  @Get('paiements/:id/facture')
  @ApiOperation({
    summary:
      "Facture d'un paiement confirme (emise a la premiere consultation si besoin)",
  })
  pourPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facturesService.trouverPourTransaction(id, user);
  }
}

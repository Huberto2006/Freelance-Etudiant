import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatistiquesService } from './statistiques.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Statistiques')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('statistiques')
export class StatistiquesController {
  constructor(private readonly statistiquesService: StatistiquesService) {}

  @Roles(Role.ADMIN)
  @Get('admin')
  @ApiOperation({ summary: "Tableau de bord global de l'activite (admin)" })
  async admin() {
    return this.statistiquesService.tableauDeBordAdmin();
  }

  @Roles(Role.ETUDIANT)
  @Get('etudiant/me')
  @ApiOperation({ summary: 'Tableau de bord personnel etudiant' })
  async etudiant(@CurrentUser() user: AuthenticatedUser) {
    return this.statistiquesService.tableauDeBordEtudiant(user.id);
  }
}

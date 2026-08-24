import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Matching')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Roles(Role.CLIENT, Role.ADMIN)
  @Get('missions/:missionId/etudiants-compatibles')
  @ApiOperation({ summary: "Etudiants les plus compatibles avec une mission (5.1)" })
  async etudiantsCompatibles(@Param('missionId') missionId: string) {
    return this.matchingService.trouverEtudiantsCompatibles(missionId);
  }

  @Roles(Role.ETUDIANT)
  @Get('missions-recommandees')
  @ApiOperation({ summary: 'Missions recommandees pour l\'etudiant connecte' })
  async missionsRecommandees(@CurrentUser() user: AuthenticatedUser) {
    return this.matchingService.trouverMissionsCompatibles(user.id);
  }
}

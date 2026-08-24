import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Evaluations')
@Controller()
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @Post('livraisons/:livraisonId/evaluation')
  @ApiOperation({ summary: 'Evaluer une livraison validee (RG5, RG6, RG12)' })
  async evaluer(
    @Param('livraisonId') livraisonId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.evaluationsService.create(livraisonId, user.id, dto);
  }

  @Public()
  @Get('etudiants/:etudiantId/evaluations')
  @ApiOperation({ summary: "Consulter les evaluations recues par un etudiant" })
  async parEtudiant(@Param('etudiantId') etudiantId: string) {
    return this.evaluationsService.findByEtudiant(etudiantId);
  }
}

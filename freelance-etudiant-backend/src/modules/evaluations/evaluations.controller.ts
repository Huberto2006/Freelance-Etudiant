import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT)
  @ApiBearerAuth()
  @Post('livraisons/:livraisonId/evaluation-client')
  @ApiOperation({
    summary:
      "RG-066 : l'etudiant evalue le client apres livraison validee et paiement confirme",
  })
  async evaluerClient(
    @Param('livraisonId') livraisonId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.evaluationsService.creerParEtudiant(
      livraisonId,
      user.id,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT, Role.ETUDIANT)
  @ApiBearerAuth()
  @Patch('evaluations/:id')
  @ApiOperation({
    summary:
      'RG-065 : modifier sa propre evaluation (client ou etudiant evaluateur)',
  })
  async modifier(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.evaluationsService.modifier(id, user.id, dto);
  }

  @Public()
  @Get('etudiants/:etudiantId/evaluations')
  @ApiOperation({ summary: "Consulter les evaluations recues par un etudiant" })
  async parEtudiant(@Param('etudiantId') etudiantId: string) {
    return this.evaluationsService.findByEtudiant(etudiantId);
  }
}

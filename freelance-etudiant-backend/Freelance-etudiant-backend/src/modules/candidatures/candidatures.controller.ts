import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CandidaturesService } from './candidatures.service';
import { CreateCandidatureDto } from './dto/create-candidature.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Candidatures')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class CandidaturesController {
  constructor(private readonly candidaturesService: CandidaturesService) {}

  @Roles(Role.ETUDIANT)
  @Post('missions/:missionId/candidatures')
  @ApiOperation({ summary: 'Postuler a une mission (RG2, RG3)' })
  async postuler(
    @Param('missionId') missionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCandidatureDto,
  ) {
    return this.candidaturesService.create(missionId, user.id, dto);
  }

  @Roles(Role.CLIENT)
  @Get('missions/:missionId/candidatures')
  @ApiOperation({ summary: 'Lister/filtrer les candidatures recues pour une mission' })
  async listerParMission(
    @Param('missionId') missionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidaturesService.findByMission(missionId, user.id);
  }

  @Roles(Role.ETUDIANT)
  @Get('candidatures/me')
  @ApiOperation({ summary: 'Lister mes propres candidatures' })
  async mesCandidatures(@CurrentUser() user: AuthenticatedUser) {
    return this.candidaturesService.findByEtudiant(user.id);
  }

  @Roles(Role.CLIENT)
  @Get('candidatures/client/toutes')
  @ApiOperation({ summary: 'Lister toutes les candidatures recues sur mes missions' })
  async toutesMesCandidaturesRecues(@CurrentUser() user: AuthenticatedUser) {
    return this.candidaturesService.findByClient(user.id);
  }

  @Roles(Role.CLIENT)
  @Patch('candidatures/:id/accepter')
  @ApiOperation({ summary: 'Accepter une candidature' })
  async accepter(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.candidaturesService.accepter(id, user.id);
  }

  @Roles(Role.CLIENT)
  @Patch('candidatures/:id/refuser')
  @ApiOperation({ summary: 'Refuser une candidature' })
  async refuser(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.candidaturesService.refuser(id, user.id);
  }
}

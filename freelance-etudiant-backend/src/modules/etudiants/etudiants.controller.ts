import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EtudiantsService } from './etudiants.service';
import { UpdateEtudiantProfileDto } from './dto/update-etudiant-profile.dto';
import { FiltrerEtudiantsDto } from './dto/filtrer-etudiants.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Etudiants')
@Controller('etudiants')
export class EtudiantsController {
  constructor(private readonly etudiantsService: EtudiantsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Recherche/annuaire des etudiants (filtre par competence, pagine)' })
  async findAll(@Query() filtres: FiltrerEtudiantsDto) {
    return this.etudiantsService.findAll(filtres);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Consulter la fiche publique d'un etudiant (projection sans donnees privees)" })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.etudiantsService.findOnePublic(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT)
  @ApiBearerAuth()
  @Patch('me')
  @ApiOperation({ summary: 'Mettre a jour son propre profil etudiant' })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEtudiantProfileDto,
  ) {
    return this.etudiantsService.update(user.id, dto);
  }
}

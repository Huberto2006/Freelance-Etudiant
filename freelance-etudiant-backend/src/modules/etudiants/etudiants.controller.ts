import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EtudiantsService } from './etudiants.service';
import { UpdateEtudiantProfileDto } from './dto/update-etudiant-profile.dto';
import { FiltrerEtudiantsDto } from './dto/filtrer-etudiants.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { CvImportService } from './cv-import.service';

/**
 * RG-VIS-001 : les profils etudiants ne sont PAS consultables par un
 * visiteur anonyme. Aucune route de ce controleur n'est marquee
 * @Public() : le JwtAuthGuard global (voir app.module.ts) exige donc un
 * jeton valide pour les deux routes ci-dessous. Tout utilisateur
 * CONNECTE peut les consulter, quel que soit son role (etudiant ou
 * client) — seule l'absence de compte bloque l'acces, pas le role.
 */
@ApiTags('Etudiants')
@ApiBearerAuth()
@Controller('etudiants')
export class EtudiantsController {
  constructor(
    private readonly etudiantsService: EtudiantsService,
    private readonly cvImportService: CvImportService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Recherche/annuaire des etudiants (filtre par competence, pagine) — reserve aux utilisateurs connectes',
  })
  async findAll(@Query() filtres: FiltrerEtudiantsDto) {
    return this.etudiantsService.findAll(filtres);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      "Consulter la fiche d'un etudiant (projection sans donnees privees) — reserve aux utilisateurs connectes",
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.etudiantsService.findOnePublic(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT)
  @ApiBearerAuth()
  @Post('me/cv-import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Importe un CV et extrait des suggestions non-destructives sans modifier le profil tant qu’elles ne sont pas validées.',
  })
  async importCv(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.cvImportService.analyserCv(file);
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

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LivraisonsService } from './livraisons.service';
import { CreerLivraisonDto, DemanderCorrectionDto } from './dto/livraison.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Livraisons')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class LivraisonsController {
  constructor(private readonly livraisonsService: LivraisonsService) {}

  @Roles(Role.ETUDIANT)
  @Post('candidatures/:candidatureId/livraison')
  @ApiOperation({ summary: 'Deposer la livraison du projet (RG8)' })
  async livrer(
    @Param('candidatureId') candidatureId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerLivraisonDto,
  ) {
    return this.livraisonsService.creer(candidatureId, user.id, dto);
  }

  @Get('livraisons/:id')
  @ApiOperation({ summary: 'Consulter une livraison' })
  async findOne(@Param('id') id: string) {
    return this.livraisonsService.findOne(id);
  }

  @Roles(Role.CLIENT)
  @Patch('livraisons/:id/valider')
  @ApiOperation({ summary: 'Valider la livraison finale (RG12)' })
  async valider(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.livraisonsService.valider(id, user.id);
  }

  @Roles(Role.CLIENT)
  @Patch('livraisons/:id/demander-correction')
  @ApiOperation({ summary: 'Demander une correction (livrable juge non conforme)' })
  async demanderCorrection(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DemanderCorrectionDto,
  ) {
    return this.livraisonsService.demanderCorrection(id, user.id, dto);
  }
}

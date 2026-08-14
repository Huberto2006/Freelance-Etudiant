import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignalementsService } from './signalements.service';
import { CreateSignalementDto, TraiterSignalementDto } from './dto/signalement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { StatutSignalement } from '../../common/enums/statut-signalement.enum';

@ApiTags('Signalements')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('signalements')
export class SignalementsController {
  constructor(private readonly signalementsService: SignalementsService) {}

  @Post()
  @ApiOperation({ summary: 'Signaler un utilisateur, un service ou une mission' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSignalementDto,
  ) {
    return this.signalementsService.create(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les signalements (filtrable par statut)' })
  async findAll(@Query('statut') statut?: StatutSignalement) {
    return this.signalementsService.findAll(statut);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Consulter le detail d'un signalement" })
  async findOne(@Param('id') id: string) {
    return this.signalementsService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/traiter')
  @ApiOperation({ summary: 'Traiter et cloturer un signalement (RG11)' })
  async traiter(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TraiterSignalementDto,
  ) {
    return this.signalementsService.traiter(id, user.id, dto);
  }
}

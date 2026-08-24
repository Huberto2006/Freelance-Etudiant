import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { CreateMissionDto, UpdateMissionDto } from './dto/mission.dto';
import { FiltrerMissionsDto } from './dto/filtrer-missions.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Missions')
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Annuaire des offres de mission (recherche multicriteres)' })
  async findAll(@Query() filtres: FiltrerMissionsDto) {
    return this.missionsService.findAll(filtres);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Consulter le detail d'une mission" })
  async findOne(@Param('id') id: string) {
    return this.missionsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Publier une mission (client uniquement, RG9)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMissionDto,
  ) {
    return this.missionsService.create(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @Get('me/mes-missions')
  @ApiOperation({ summary: 'Lister mes propres missions publiees' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.missionsService.findByClient(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Editer une de mes missions' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missionsService.update(id, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une de mes missions' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.missionsService.remove(id, user.id);
    return { message: 'Mission supprimee' };
  }
}

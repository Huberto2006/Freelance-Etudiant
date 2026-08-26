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
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { FiltrerServicesDto } from './dto/filtrer-services.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Recherche multicriteres des services publies' })
  async findAll(@Query() filtres: FiltrerServicesDto) {
    return this.servicesService.findAll(filtres);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Consulter le detail d'un service" })
  async findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Publier un nouveau service (etudiant uniquement)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT)
  @ApiBearerAuth()
  @Get('me/mes-services')
  @ApiOperation({ summary: 'Lister mes propres services publies' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.servicesService.findByEtudiant(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Editer un de mes services' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ETUDIANT)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un de mes services' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.servicesService.remove(id, user.id);
    return { message: 'Service supprime' };
  }
}

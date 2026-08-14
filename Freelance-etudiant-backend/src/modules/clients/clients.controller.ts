import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.CLIENT)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Consulter son propre profil client' })
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.clientsService.findByUtilisateurId(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Mettre a jour son propre profil client' })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.clientsService.update(user.id, dto);
  }
}

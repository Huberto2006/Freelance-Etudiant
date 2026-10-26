import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AutoriserRoleADefinir } from '../../common/decorators/autoriser-role-a-definir.decorator';
import { ModifierLangueDto } from './dto/modifier-langue.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @AutoriserRoleADefinir()
  async getMonProfil(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findByIdOrFail(user.id);
  }

  @Patch('me/langue')
  @AutoriserRoleADefinir()
  async modifierMaLangue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ModifierLangueDto,
  ) {
    const langue = await this.usersService.modifierLangue(user.id, dto.langue);
    return { langue };
  }
}

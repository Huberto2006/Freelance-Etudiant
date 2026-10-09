import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AutoriserRoleADefinir } from '../../common/decorators/autoriser-role-a-definir.decorator';
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
}

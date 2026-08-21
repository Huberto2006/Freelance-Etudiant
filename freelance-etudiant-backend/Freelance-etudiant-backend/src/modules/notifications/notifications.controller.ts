import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes notifications (100 plus recentes)' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.findByUser(user.id);
  }

  @Get('non-lues/compteur')
  @ApiOperation({ summary: 'Compter mes notifications non lues' })
  async compteur(@CurrentUser() user: AuthenticatedUser) {
    const total = await this.notificationsService.compterNonLues(user.id);
    return { total };
  }

  @Patch(':id/lue')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async marquerLue(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.marquerLue(id, user.id);
    return { message: 'Notification marquee comme lue' };
  }

  @Patch('lire-tout')
  @ApiOperation({ summary: 'Marquer toutes mes notifications comme lues' })
  async marquerToutesLues(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.marquerToutesLues(user.id);
    return { message: 'Toutes les notifications ont ete marquees comme lues' };
  }
}

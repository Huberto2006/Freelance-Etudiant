import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfileCompletionService } from './profile-completion.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/**
 * Etat de completion du profil, calcule exclusivement cote serveur a
 * partir des donnees en base. Utilise par le frontend pour decider
 * entre le questionnaire (/completer-profil) et le dashboard, et pour
 * afficher la progression — sans jamais pouvoir forcer la valeur.
 */
@ApiTags('Profil')
@ApiBearerAuth()
@Controller('users')
export class ProfileCompletionController {
  constructor(
    private readonly profileCompletionService: ProfileCompletionService,
  ) {}

  @Get('me/profile-completion')
  @ApiOperation({
    summary:
      "Etat de completion de mon profil (calcule cote serveur, specifique au role)",
  })
  async getMaCompletion(@CurrentUser() user: AuthenticatedUser) {
    return this.profileCompletionService.calculer(user.id);
  }
}
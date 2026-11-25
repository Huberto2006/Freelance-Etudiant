import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { SessionsService } from './sessions.service';
import { SessionResponseDto } from './dto/session-response.dto';

const LIMITE_SESSIONS_ECRITURE = { default: { limit: 15, ttl: 60000 } };
const LIMITE_SESSIONS_LECTURE = { default: { limit: 60, ttl: 60000 } };

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('current')
  @Throttle(LIMITE_SESSIONS_LECTURE)
  @ApiOperation({ summary: "Obtenir les informations de la session active courante" })
  async obtenirSessionCourante(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionResponseDto> {
    return this.sessionsService.obtenirSessionActuelle(user.id, user.sessionId);
  }

  @Get()
  @Throttle(LIMITE_SESSIONS_LECTURE)
  @ApiOperation({ summary: "Lister les sessions actives de l'utilisateur connecté" })
  async listerSessions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionResponseDto[]> {
    return this.sessionsService.listerSessionsUtilisateur(user.id, user.sessionId);
  }

  @Delete('others')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_SESSIONS_ECRITURE)
  @ApiOperation({
    summary: 'Révoquer toutes les autres sessions actives sauf la session courante',
  })
  async revoquerAutresSessions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string; revoquees: number }> {
    return this.sessionsService.revoquerAutresSessions(user.id, user.sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_SESSIONS_ECRITURE)
  @ApiOperation({ summary: 'Révoquer une session spécifique par son identifiant' })
  async revoquerSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.sessionsService.revoquerSession(id, user.id);
    return { message: 'Session révoquée avec succès' };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_SESSIONS_ECRITURE)
  @ApiOperation({ summary: "Révoquer toutes les sessions de l'utilisateur" })
  async revoquerToutesSessions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string; revoquees: number }> {
    return this.sessionsService.revoquerToutesSessions(user.id);
  }
}

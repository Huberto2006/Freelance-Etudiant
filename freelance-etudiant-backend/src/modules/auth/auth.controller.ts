import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import {
  VerificationEmailDto,
  RenvoyerVerificationEmailDto,
} from './dto/verification-email.dto';
import { Public } from '../../common/decorators/public.decorator';

/*
 * Rate limiting cible au-dessus de la limite globale (100 req/min/IP definie
 * dans AppModule). Ces endpoints sont publiques : sans limite dediee, ils
 * permettent la brute force de mots de passe et l'abus d'envoi d'emails.
 * Les valeurs restent larges pour l'usage normal de Kianja (retries inclus).
 */
const LIMITE_LOGIN = { default: { limit: 10, ttl: 60000 } };
const LIMITE_REGISTER = { default: { limit: 5, ttl: 60000 } };
const LIMITE_REFRESH = { default: { limit: 30, ttl: 60000 } };
const LIMITE_EMAIL = { default: { limit: 3, ttl: 60000 } };

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle(LIMITE_REGISTER)
  @ApiOperation({ summary: "Inscription d'un etudiant ou d'un client" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_LOGIN)
  @ApiOperation({ summary: 'Connexion' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_REFRESH)
  @ApiOperation({ summary: "Rafraichir le jeton d'acces" })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_EMAIL)
  @ApiOperation({ summary: 'Demander un lien de reinitialisation de mot de passe' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reinitialiser le mot de passe a partir du jeton recu' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_EMAIL)
  @ApiOperation({
    summary: "Verifier l'adresse email a partir du jeton recu dans l'email",
  })
  async verifierEmail(@Body() dto: VerificationEmailDto) {
    return this.authService.verifierEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_EMAIL)
  @ApiOperation({ summary: "Renvoyer un email de verification" })
  async renvoyerVerificationEmail(
    @Body() dto: RenvoyerVerificationEmailDto,
  ) {
    return this.authService.renvoyerVerificationEmail(dto);
  }
}

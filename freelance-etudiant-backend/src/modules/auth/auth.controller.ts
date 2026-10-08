import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, SessionEmise } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import {
  VerificationEmailDto,
  RenvoyerVerificationEmailDto,
} from './dto/verification-email.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  NOM_COOKIE_REFRESH,
  effacerCookieRefresh,
  lireCookie,
  poserCookieRefresh,
} from './utils/cookies.util';

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
const LIMITE_RESET = { default: { limit: 10, ttl: 60000 } };

/**
 * En-tete obligatoire sur les routes authentifiees par COOKIE (refresh,
 * logout). Un formulaire ou une image d'un site tiers ne peut pas l'ajouter ;
 * un fetch cross-origin qui le contiendrait declenche un preflight CORS
 * refuse hors des origines autorisees : protection CSRF en profondeur.
 */
const ENTETE_CSRF = 'x-kianja-csrf';

function exigerEnteteCsrf(req: Request): void {
  if (req.headers[ENTETE_CSRF] !== '1') {
    throw new ForbiddenException('Requete refusee');
  }
}

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Le refresh token ne quitte jamais le serveur dans le corps JSON : il est
   * depose dans un cookie httpOnly (illisible par JavaScript, donc par une
   * XSS). Le corps ne contient que l'access token court et l'utilisateur.
   */
  private repondreSession(res: Response, session: SessionEmise) {
    poserCookieRefresh(
      res,
      this.configService,
      session.refreshToken,
      session.refreshExp,
    );
    return {
      accessToken: session.accessToken,
      premiereConnexion: session.premiereConnexion,
      utilisateur: session.utilisateur,
    };
  }

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
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.authService.login(dto);
    return this.repondreSession(res, session);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_REFRESH)
  @ApiOperation({ summary: "Rafraichir le jeton d'acces (cookie httpOnly)" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    exigerEnteteCsrf(req);
    try {
      const session = await this.authService.refreshToken(
        lireCookie(req, NOM_COOKIE_REFRESH),
      );
      return this.repondreSession(res, session);
    } catch (error) {
      // Cookie devenu invalide : on le supprime cote navigateur.
      effacerCookieRefresh(res, this.configService);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_REFRESH)
  @ApiOperation({ summary: 'Deconnexion : revoque la session et efface le cookie' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    exigerEnteteCsrf(req);
    await this.authService.logout(lireCookie(req, NOM_COOKIE_REFRESH));
    effacerCookieRefresh(res, this.configService);
    return { message: 'Deconnecte' };
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
  @Throttle(LIMITE_RESET)
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

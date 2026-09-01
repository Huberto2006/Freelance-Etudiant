import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { CreerPaiementDto } from './dto/creer-paiement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { StatutTransaction } from '../../common/enums/statut-transaction.enum';

@ApiTags('Paiements')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class PaiementsController {
  constructor(
    private readonly paiementsService: PaiementsService,
    private readonly configService: ConfigService,
  ) {}

  @Roles(Role.CLIENT)
  @Post('candidatures/:candidatureId/paiement')
  @ApiOperation({
    summary:
      "Payer une candidature acceptee : MVola en ligne (reel) ou declaration de virement",
  })
  async creer(
    @Param('candidatureId') candidatureId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerPaiementDto,
  ) {
    return this.paiementsService.creer(candidatureId, user.id, dto);
  }

  /**
   * Webhook fournisseur (public mais signe). La signature HMAC-SHA256 du
   * corps brut est exigee dans l'en-tete X-Kianja-Signature
   * ("sha256=<hex>") ; secret : PAIEMENT_WEBHOOK_SECRET. Declared BEFORE
   * 'paiements/:id/verifier' to avoid route shadowing by ':id'.
   */
  @Public()
  @Post('paiements/webhook/mvola')
  @ApiExcludeEndpoint()
  async webhookMvola(
    @Req() req: Request,
    @Headers('x-kianja-signature') signature?: string,
  ) {
    const secret = this.configService.get<string>('PAIEMENT_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Webhook non configure');
    }
    if (!signature || !signature.startsWith('sha256=')) {
      throw new UnauthorizedException('Signature webhook manquante');
    }

    const corpsBrut = (req as Request & { rawBody?: Buffer }).rawBody;
    const attendu = crypto
      .createHmac('sha256', secret)
      .update(corpsBrut ?? Buffer.alloc(0))
      .digest('hex');
    const recu = signature.slice('sha256='.length);

    const a = Buffer.from(attendu, 'hex');
    const b = Buffer.from(recu, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Signature webhook invalide');
    }

    return this.paiementsService.traiterWebhook(req.body);
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Post('paiements/:id/verifier')
  @ApiOperation({
    summary:
      "Verifier aupres du fournisseur (MVola) le statut reel d'un paiement en ligne",
  })
  async verifier(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paiementsService.verifier(
      id,
      user.id,
      user.role === Role.ADMIN,
    );
  }

  @Roles(Role.CLIENT)
  @Get('paiements/me')
  @ApiOperation({ summary: 'Historique de mes paiements envoyes' })
  async mesPaiements(@CurrentUser() user: AuthenticatedUser) {
    return this.paiementsService.findByClient(user.id);
  }

  @Roles(Role.ETUDIANT)
  @Get('paiements/recus')
  @ApiOperation({ summary: 'Historique des paiements recus' })
  async paiementsRecus(@CurrentUser() user: AuthenticatedUser) {
    return this.paiementsService.findByEtudiant(user.id);
  }

  @Roles(Role.ADMIN)
  @Get('paiements')
  @ApiOperation({ summary: 'Lister tous les paiements (filtrable par statut)' })
  async findAll(@Query('statut') statut?: StatutTransaction) {
    return this.paiementsService.findAll(statut);
  }

  @Roles(Role.ADMIN)
  @Patch('paiements/:id/confirmer')
  @ApiOperation({ summary: 'Confirmer la reception effective des fonds' })
  async confirmer(@Param('id') id: string) {
    return this.paiementsService.confirmer(id);
  }

  @Roles(Role.ADMIN)
  @Patch('paiements/:id/annuler')
  @ApiOperation({ summary: 'Annuler un paiement declare a tort' })
  async annuler(@Param('id') id: string) {
    return this.paiementsService.annuler(id);
  }
}

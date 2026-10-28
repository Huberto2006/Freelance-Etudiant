import {
  BadRequestException,
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
  ParseUUIDPipe,
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
      "Payer une candidature acceptee : Papi ou MVola en ligne (reel), ou declaration de virement",
  })
  async creer(
    @Param('candidatureId', ParseUUIDPipe) candidatureId: string,
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
    verifierSignatureWebhook(
      req,
      signature,
      this.configService.get<string>('PAIEMENT_WEBHOOK_SECRET'),
    );
    return this.paiementsService.traiterWebhook(req.body, 'mvola');
  }

  /**
   * Webhook Papi (public mais signe). En-tete `X-Papi-Signature: t=<unix>,v1=<hex>` ;
   * v1 = HMAC-SHA256 de `<t>.<corps brut>` avec le secret COMPLET (prefixe
   * `pwhsec_` inclus) ; tolerance 300 s (docs.papi.mg, securing-notifications).
   * Secret : PAPI_WEBHOOK_SECRET ; en-tete : PAPI_SIGNATURE_HEADER.
   * Comme pour MVola, la notification n'est qu'un declencheur : le statut
   * reel est relu aupres de Papi avant toute confirmation.
   */
  @Public()
  @Post('paiements/webhook/papi')
  @ApiExcludeEndpoint()
  async webhookPapi(@Req() req: Request) {
    const nomEntete = (
      this.configService.get<string>('PAPI_SIGNATURE_HEADER') ||
      'x-papi-signature'
    ).toLowerCase();
    const brut = req.headers[nomEntete];
    const signature = Array.isArray(brut) ? brut[0] : brut;

    verifierSignaturePapi(
      req,
      signature,
      this.configService.get<string>('PAPI_WEBHOOK_SECRET'),
    );
    return this.paiementsService.traiterWebhook(req.body, 'papi');
  }

  @Roles(Role.CLIENT, Role.ADMIN)
  @Post('paiements/:id/verifier')
  @ApiOperation({
    summary:
      "Verifier aupres du fournisseur (MVola) le statut reel d'un paiement en ligne",
  })
  async verifier(
    @Param('id', ParseUUIDPipe) id: string,
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

  /**
   * RG-PAY : coordonnees de l'etudiant beneficiaire lorsque le paiement
   * est reellement du. Route securisee (JAMAIS de route publique par
   * etudiant) : le client doit posseder la mission ET la livraison
   * correspondante doit etre validee.
   * Declaree AVANT 'paiements/:id/...' pour eviter tout masquage.
   */
  @Roles(Role.CLIENT, Role.ADMIN)
  @Get('candidatures/:candidatureId/moyens-paiement')
  @ApiOperation({
    summary:
      "Coordonnees de paiement de l'etudiant beneficiaire (livraison validee requise)",
  })
  async moyensPaiementCandidature(
    @Param('candidatureId', ParseUUIDPipe) candidatureId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paiementsService.moyensPourCandidature(
      candidatureId,
      user.id,
      user.role === Role.ADMIN,
    );
  }

  /**
   * RG-PAY : coordonnees associees a un paiement existant. Seul le
   * client proprietaire de la transaction (ou un administrateur) y a
   * acces : changer l'identifiant dans l'URL renvoie 403.
   */
  @Roles(Role.CLIENT, Role.ADMIN)
  @Get('paiements/:id/moyens-paiement')
  @ApiOperation({
    summary:
      "Coordonnees de paiement de l'etudiant beneficiaire pour un paiement existant",
  })
  async moyensPaiementTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paiementsService.moyensPourPaiement(
      id,
      user.id,
      user.role === Role.ADMIN,
    );
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
  async confirmer(@Param('id', ParseUUIDPipe) id: string) {
    return this.paiementsService.confirmer(id);
  }

  @Roles(Role.ADMIN)
  @Patch('paiements/:id/annuler')
  @ApiOperation({ summary: 'Annuler un paiement declare a tort' })
  async annuler(@Param('id', ParseUUIDPipe) id: string) {
    return this.paiementsService.annuler(id);
  }
}


/**
 * Verifie la signature HMAC-SHA256 (hex, prefixe optionnel "sha256=") du
 * corps BRUT d'un webhook fournisseur, en temps constant. Echoue ferme :
 * secret absent -> 503, signature absente/invalide -> 401, corps non objet
 * -> 400.
 */
export function verifierSignatureWebhook(
  req: Request,
  signature: string | undefined,
  secret: string | undefined,
): void {
  if (!secret) {
    throw new ServiceUnavailableException('Webhook non configure');
  }
  if (!signature) {
    throw new UnauthorizedException('Signature webhook manquante');
  }

  const corpsBrut = (req as Request & { rawBody?: Buffer }).rawBody;
  const attendu = crypto
    .createHmac('sha256', secret)
    .update(corpsBrut ?? Buffer.alloc(0))
    .digest('hex');
  const recu = signature.trim().replace(/^sha256=/i, '');

  const a = Buffer.from(attendu, 'hex');
  const b = /^[0-9a-fA-F]+$/.test(recu) ? Buffer.from(recu, 'hex') : Buffer.alloc(0);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new UnauthorizedException('Signature webhook invalide');
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new BadRequestException('Notification invalide');
  }
}


/** Tolerance maximale entre l'horodatage signe par Papi et l'heure serveur. */
export const TOLERANCE_SIGNATURE_PAPI_S = 300;

/**
 * Verifie `X-Papi-Signature: t=<unix>,v1=<hex>` (contrat officiel Papi) :
 * HMAC-SHA256 de `<t>.<corps brut>`, secret complet, comparaison en temps
 * constant, horodatage a +/- 300 s (anti-rejeu). Echoue ferme : secret absent
 * -> 503 ; en-tete absent/mal forme, signature fausse ou horodatage hors
 * fenetre -> 401 ; corps non objet -> 400.
 */
export function verifierSignaturePapi(
  req: Request,
  entete: string | undefined,
  secret: string | undefined,
  maintenantS: number = Math.floor(Date.now() / 1000),
): void {
  const cle = secret?.trim();
  if (!cle) {
    throw new ServiceUnavailableException('Webhook non configure');
  }
  if (!entete) {
    throw new UnauthorizedException('Signature webhook manquante');
  }

  let t: string | undefined;
  let v1: string | undefined;
  for (const morceau of entete.split(',')) {
    const [nom, ...reste] = morceau.trim().split('=');
    const valeur = reste.join('=').trim();
    if (nom === 't') t = valeur;
    if (nom === 'v1') v1 = valeur;
  }
  if (!t || !/^\d{1,12}$/.test(t) || !v1 || !/^[0-9a-f]{64}$/.test(v1)) {
    throw new UnauthorizedException('Signature webhook mal formee');
  }

  const corpsBrut = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
  const attendu = crypto
    .createHmac('sha256', cle)
    .update(Buffer.concat([Buffer.from(`${t}.`), corpsBrut]))
    .digest();
  const recu = Buffer.from(v1, 'hex');
  if (attendu.length !== recu.length || !crypto.timingSafeEqual(attendu, recu)) {
    throw new UnauthorizedException('Signature webhook invalide');
  }

  if (Math.abs(maintenantS - Number(t)) > TOLERANCE_SIGNATURE_PAPI_S) {
    throw new UnauthorizedException('Notification expiree');
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new BadRequestException('Notification invalide');
  }
}

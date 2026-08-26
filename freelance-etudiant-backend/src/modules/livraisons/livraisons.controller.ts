import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { LivraisonsService } from "./livraisons.service";

import {
  CreerLivraisonDto,
  DemanderCorrectionDto,
} from "./dto/livraison.dto";

import { CurrentUser } from "../../common/decorators/current-user.decorator";

import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";

import { Roles } from "../../common/decorators/roles.decorator";

import { RolesGuard } from "../auth/guards/roles.guard";

import { Role } from "../../common/enums/role.enum";

@ApiTags("Livraisons")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class LivraisonsController {
  constructor(
    private readonly livraisonsService: LivraisonsService,
  ) {}

  // =========================================================
  // ÉTUDIANT — DÉPOSER OU MODIFIER UNE LIVRAISON
  // =========================================================

  @Roles(Role.ETUDIANT)
  @Post("candidatures/:candidatureId/livraison")
  @ApiOperation({
    summary: "Déposer ou modifier une livraison",
  })
  async livrer(
    @Param("candidatureId") candidatureId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreerLivraisonDto,
  ) {
    return this.livraisonsService.creer(
      candidatureId,
      user.id,
      dto,
    );
  }

  // =========================================================
  // ÉTUDIANT — MES LIVRAISONS
  // =========================================================

  @Roles(Role.ETUDIANT)
  @Get("livraisons/me")
  @ApiOperation({
    summary: "Lister mes livraisons",
  })
  async findMesLivraisons(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.livraisonsService.findByEtudiant(
      user.id,
    );
  }

  // =========================================================
  // CLIENT — LIVRAISONS REÇUES
  // =========================================================

  @Roles(Role.CLIENT)
  @Get("livraisons/client/toutes")
  @ApiOperation({
    summary: "Lister les livraisons reçues",
  })
  async findLivraisonsClient(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.livraisonsService.findByClient(
      user.id,
    );
  }

  // =========================================================
  // ÉTUDIANT / CLIENT — UNE LIVRAISON
  // =========================================================

  @Roles(Role.ETUDIANT, Role.CLIENT)
  @Get("livraisons/:id")
  @ApiOperation({
    summary: "Consulter une livraison",
  })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.livraisonsService.findOneForUser(
      id,
      user.id,
    );
  }

  // =========================================================
  // CLIENT — VALIDER
  // =========================================================

  @Roles(Role.CLIENT)
  @Patch("livraisons/:id/valider")
  @ApiOperation({
    summary: "Valider une livraison",
  })
  async valider(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.livraisonsService.valider(
      id,
      user.id,
    );
  }

  // =========================================================
  // CLIENT — DEMANDER UNE CORRECTION
  // =========================================================

  @Roles(Role.CLIENT)
  @Patch("livraisons/:id/demander-correction")
  @ApiOperation({
    summary: "Demander une correction",
  })
  async demanderCorrection(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DemanderCorrectionDto,
  ) {
    return this.livraisonsService.demanderCorrection(
      id,
      user.id,
      dto,
    );
  }
}
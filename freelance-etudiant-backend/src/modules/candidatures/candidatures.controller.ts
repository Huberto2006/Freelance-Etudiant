import {
  Body,
  Controller,
  Delete,
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

import { CandidaturesService } from "./candidatures.service";

import { CreateCandidatureDto } from "./dto/create-candidature.dto";

import { CurrentUser } from "../../common/decorators/current-user.decorator";

import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";

import { Roles } from "../../common/decorators/roles.decorator";

import { RolesGuard } from "../auth/guards/roles.guard";

import { Role } from "../../common/enums/role.enum";

@ApiTags("Candidatures")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class CandidaturesController {
  constructor(
    private readonly candidaturesService: CandidaturesService,
  ) { }

  // ============================================================
  // ÉTUDIANT : POSTULER À UNE MISSION
  // ============================================================

  @Roles(Role.ETUDIANT)
  @Post("missions/:missionId/candidatures")
  @ApiOperation({
    summary: "Postuler à une mission",
  })
  async postuler(
    @Param("missionId") missionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCandidatureDto,
  ) {
    return this.candidaturesService.create(
      missionId,
      user.id,
      dto,
    );
  }

  // ============================================================
  // CLIENT : VOIR LES CANDIDATURES D'UNE MISSION
  // ============================================================

  @Roles(Role.CLIENT)
  @Get("missions/:missionId/candidatures")
  @ApiOperation({
    summary:
      "Lister les candidatures reçues pour une mission",
  })
  async listerParMission(
    @Param("missionId") missionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidaturesService.findByMission(
      missionId,
      user.id,
    );
  }

  // ============================================================
  // ÉTUDIANT : MES CANDIDATURES
  // ============================================================

  @Roles(Role.ETUDIANT)
  @Get("candidatures/me")
  @ApiOperation({
    summary: "Lister mes candidatures",
  })
  async mesCandidatures(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidaturesService.findByEtudiant(
      user.id,
    );
  }

  // ============================================================
  // CLIENT : TOUTES MES CANDIDATURES REÇUES
  // ============================================================

  @Roles(Role.CLIENT)
  @Get("candidatures/client")
  @ApiOperation({
    summary:
      "Lister les candidatures reçues sur mes missions",
  })
  async toutesMesCandidaturesRecues(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidaturesService.findByClient(
      user.id,
    );
  }

  // ============================================================
  // CLIENT : ACCEPTER
  // ============================================================

  @Roles(Role.CLIENT)
  @Patch("candidatures/:id/accepter")
  @ApiOperation({
    summary: "Accepter une candidature",
  })
  async accepter(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidaturesService.accepter(
      id,
      user.id,
    );
  }

  // ============================================================
  // CLIENT : REFUSER
  // ============================================================

  @Roles(Role.CLIENT)
  @Patch("candidatures/:id/refuser")
  @ApiOperation({
    summary: "Refuser une candidature",
  })
  async refuser(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidaturesService.refuser(
      id,
      user.id,
    );
  }

  @Roles(Role.ETUDIANT)
  @Patch("candidatures/:id")
  @ApiOperation({ summary: "Modifier une candidature en attente" })
  async modifier(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCandidatureDto,
  ) {
    return this.candidaturesService.modifier(id, user.id, dto);
  }

  @Roles(Role.ETUDIANT)
  @Delete("candidatures/:id")
  @ApiOperation({ summary: "Annuler une candidature en attente" })
  async annuler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.candidaturesService.annuler(id, user.id);
    return { message: "Candidature annulee" };
  }

  // ============================================================
  // ÉTUDIANT : POSTULER À UNE MISSION AU NOM D'UN GROUPE
  // ============================================================

  @Roles(Role.ETUDIANT)
  @Post("missions/:missionId/groupes/:groupeId/candidatures")
  @ApiOperation({
    summary: "Postuler à une mission au nom d'un groupe",
  })
  async postulerAvecGroupe(
    @Param("missionId") missionId: string,
    @Param("groupeId") groupeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCandidatureDto,
  ) {
    return this.candidaturesService.createGroupe(
      missionId,
      groupeId,
      user.id,
      dto,
    );
  }
}
import { Module } from '@nestjs/common';

import { MissionsModule } from '../missions/missions.module';
import { ServicesModule } from '../services/services.module';
import { UsersModule } from '../users/users.module';

import { VerificationCibleService } from './verification-cible.service';

/**
 * RG-068 — cibles polymorphes (commentaires, reactions de contenu, favoris).
 *
 * Porte le type de cible de contenu et la verification d'existence d'une
 * cible. S'appuie sur les services metiers exportes (MissionsService,
 * ServicesService, UsersService) ; anciennement `common/common.module.ts`,
 * deplace ici car il depend de modules metier.
 */
@Module({
  imports: [MissionsModule, ServicesModule, UsersModule],
  providers: [VerificationCibleService],
  exports: [VerificationCibleService],
})
export class CiblesModule {}

import { Module } from '@nestjs/common';

import { MissionsModule } from '../modules/missions/missions.module';
import { ServicesModule } from '../modules/services/services.module';
import { UsersModule } from '../modules/users/users.module';

import { VerificationCibleService } from './services/verification-cible.service';

/**
 * RG-068 — module partage.
 *
 * Regroupe les services transversaux qui n'appartiennent a aucun module
 * metier en particulier mais ont besoin des services metiers deja
 * exportes (MissionsService, ServicesService, UsersService) pour
 * verifier l'integrite des cibles polymorphes.
 */
@Module({
  imports: [MissionsModule, ServicesModule, UsersModule],
  providers: [VerificationCibleService],
  exports: [VerificationCibleService],
})
export class CommonModule {}

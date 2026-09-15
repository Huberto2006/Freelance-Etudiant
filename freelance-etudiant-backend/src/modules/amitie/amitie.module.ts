import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Amitie } from './entities/amitie.entity';
import { EtudiantProfile } from '../etudiants/entities/etudiant-profile.entity';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

let AmitieController: any;

try {
  ({ AmitieController } = require('./controllers/amitie.controller'));
} catch {
  try {
    ({ AmitieController } = require('./controller/amitie.controller'));
  } catch {
    ({ AmitieController } = require('./amitie.controller'));
  }
}

let AmitieService: any;

try {
  ({ AmitieService } = require('./service/amitie.service'));
} catch {
  try {
    ({ AmitieService } = require('./services/amitie.service'));
  } catch {
    ({ AmitieService } = require('./amitie.service'));
  }
}

/**
 * Module Amitiés : relation d'amitié entre étudiants, indépendante des
 * missions, candidatures et groupes.
 *
 * AmitieService est exporté afin que MessagesModule puisse y recourir
 * (amitieService.sontAmis) lors d'une prochaine étape d'intégration.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Amitie,
      EtudiantProfile,
    ]),

    /*
     * UsersService : vérifier que le destinataire d'une demande est
     * bien un étudiant (et non un client ou un admin).
     */
    forwardRef(() => UsersModule),

    /*
     * RealtimeGateway : pousser les évènements d'amitié (demande reçue,
     * acceptée, refusée, amitié supprimée) via le système temps réel
     * existant, sans créer de socket parallèle.
     */
    forwardRef(() => RealtimeModule),


    forwardRef(() => NotificationsModule),
  ],

  controllers: [
    AmitieController,
  ],

  providers: [
    AmitieService,
  ],

  exports: [
    AmitieService,
  ],
})
export class AmitieModule { }

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { MissionsService } from './missions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../../common/enums/type-notification.enum';

/**
 * Planificateur d'expiration des missions (RG3).
 *
 * Passe periodiquement les missions publiques encore ouvertes dont la
 * date limite est depassee au statut EXPIREE, puis notifie UNE SEULE FOIS
 * le client proprietaire via le systeme de notifications existant.
 *
 * Aucune nouvelle dependance : un simple intervalle Node.js, demarre au
 * chargement du module et arrete proprement a la destruction. Un balayage
 * de rattrapage est execute immediatement au demarrage : les missions qui
 * ont expire pendant l'arret du serveur sont transitionnees et notifiees
 * une seule fois, jamais dupliquees (la transition conditionnelle de
 * MissionsService.expirerMissionsArriveesAEcheance garantit qu'un seul
 * appel obtient la ligne).
 */
@Injectable()
export class ExpirationMissionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpirationMissionsService.name);

  /** Intervalle entre deux balayages (5 minutes). */
  private static readonly INTERVALLE_MS = 5 * 60 * 1000;

  private timer: NodeJS.Timeout | null = null;
  private balayageEnCours = false;

  constructor(
    private readonly missionsService: MissionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    // Rattrapage au demarrage (missions expirees pendant l'arret).
    void this.balayer();

    this.timer = setInterval(() => {
      void this.balayer();
    }, ExpirationMissionsService.INTERVALLE_MS);
    // N'empeche jamais le processus de se terminer proprement.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Un seul balayage a la fois (protection si un cycle depasse l'intervalle).
   * Chaque erreur est journalisee sans jamais interrompre le serveur :
   * l'expiration est secondaire par rapport aux operations metier.
   */
  async balayer(): Promise<void> {
    if (this.balayageEnCours) return;
    this.balayageEnCours = true;

    try {
      const expirees =
        await this.missionsService.expirerMissionsArriveesAEcheance();

      for (const mission of expirees) {
        this.logger.log(
          `Mission "${mission.titre}" (${mission.id}) passee a EXPIREE.`,
        );

        // Notification systeme existant : in-app + temps reel WebSocket.
        // Appel unique par mission grace a la transition conditionnelle.
        await this.notificationsService.creer({
          destinataireId: mission.clientId,
          type: TypeNotification.MISSION_EXPIREE,
          titre: 'Mission arrivée à échéance',
          message: `Votre mission "${mission.titre}" est arrivée à échéance : elle n'accepte plus de candidature.`,
          lienUrl: '/tableau-de-bord/mes-missions',
        });
      }
    } catch (erreur) {
      this.logger.error(
        `Balayage d'expiration impossible : ${
          erreur instanceof Error ? erreur.message : String(erreur)
        }`,
      );
    } finally {
      this.balayageEnCours = false;
    }
  }
}

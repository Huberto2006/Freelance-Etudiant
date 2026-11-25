import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
import type { Request } from 'express';
import { UserSession } from './entities/user-session.entity';
import { SessionResponseDto } from './dto/session-response.dto';
import {
  extraireInfosClient,
  type ClientDeviceInfos,
} from './utils/device-detector.util';
import { NotificationsService } from '../notifications/notifications.service';
import { TypeNotification } from '../notifications/enums/type-notification.enum';
import { EmailService } from '../email/email.service';
import { Utilisateur } from '../users/entities/utilisateur.entity';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private static readonly INTERVALLE_MAJ_ACTIVITE_MS = 60_000;

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enregistre une nouvelle session utilisateur et declenche l'alerte de connexion.
   */
  async enregistrerSession(
    utilisateur: Utilisateur,
    refreshTokenHash: string,
    dateExpiration: Date,
    req?: Request,
    sessionId?: string,
  ): Promise<UserSession> {
    const infosClient: ClientDeviceInfos = req
      ? extraireInfosClient(req)
      : {
          typeAppareil: 'inconnu',
          navigateur: 'Inconnu',
          systemeExploitation: 'Inconnu',
          adresseIp: 'Inconnue',
        };

    const session = this.sessionRepo.create({
      ...(sessionId ? { id: sessionId } : {}),
      utilisateurId: utilisateur.id,
      refreshTokenHash,
      typeAppareil: infosClient.typeAppareil,
      navigateur: infosClient.navigateur,
      systemeExploitation: infosClient.systemeExploitation,
      adresseIp: infosClient.adresseIp,
      userAgent: infosClient.userAgentBrut,
      dateExpiration,
      derniereActivite: new Date(),
    });

    const sessionEnregistree = await this.sessionRepo.save(session);

    // Le User-Agent est falsifiable : chaque nouvelle session authentifiee
    // declenche une alerte plutot que de le traiter comme une preuve d'appareil connu.
    void this.alerterNouvelAppareil(utilisateur, infosClient);

    return sessionEnregistree;
  }

  /**
   * Alerte l'utilisateur en cas de connexion depuis un nouvel appareil (in-app + email).
   */
  private async alerterNouvelAppareil(
    utilisateur: Utilisateur,
    client: ClientDeviceInfos,
  ): Promise<void> {
    try {
      const lienSessions = '/tableau-de-bord/parametres/securite/sessions';

      // 1. Notification in-app temps reel
      await this.notificationsService.creer({
        destinataireId: utilisateur.id,
        type: TypeNotification.NOUVELLE_CONNEXION,
          titre: 'Nouvelle connexion détectée',
          message: `Une nouvelle session (${client.navigateur} sur ${client.systemeExploitation}) a été ouverte.`,
        lienUrl: lienSessions,
      });

      // 2. Email de securite
      if (utilisateur.email) {
        const frontendUrl =
          this.configService.get<string>('app.frontendUrl') ??
          'http://localhost:3001';
        const urlComplete = `${frontendUrl.replace(/\/+$/, '')}${lienSessions}`;

        await this.emailService.envoyerAlerteNouvelleConnexion(utilisateur.email, {
          nom: utilisateur.nom || 'Utilisateur',
          typeAppareil: client.typeAppareil,
          navigateur: client.navigateur,
          systemeExploitation: client.systemeExploitation,
          adresseIp: client.adresseIp,
          dateConnexion: new Date(),
          lienSessions: urlComplete,
          langue: utilisateur.langue,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Echec de l'envoi de l'alerte nouvelle connexion pour ${utilisateur.id} : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Met a jour l'activite et le hash du refresh token lors d'une rotation de jeton.
   * Ne declenche JAMAIS de notification de nouvelle session.
   */
  async rafraichirSession(
    sessionId: string,
    nouveauTokenHash: string,
    nouvelleExpiration: Date,
    req?: Request,
  ): Promise<void> {
    const maj: Partial<UserSession> = {
      refreshTokenHash: nouveauTokenHash,
      dateExpiration: nouvelleExpiration,
      derniereActivite: new Date(),
    };

    if (req) {
      const { adresseIp, userAgentBrut } = extraireInfosClient(req);
      if (adresseIp && adresseIp !== 'Inconnue') {
        maj.adresseIp = adresseIp;
      }
      if (userAgentBrut) {
        maj.userAgent = userAgentBrut;
      }
    }

    await this.sessionRepo.update(
      { id: sessionId, dateRevocation: IsNull() },
      maj,
    );
  }

  /**
   * Verifie si une session est toujours valide et non revoquee.
   */
  async estSessionValide(sessionId: string, utilisateurId: string): Promise<boolean> {
    const session = await this.sessionRepo.findOne({
      where: {
        id: sessionId,
        utilisateurId,
        dateRevocation: IsNull(),
        dateExpiration: MoreThan(new Date()),
      },
      select: ['id'],
    });

    return Boolean(session);
  }

  /**
   * Valide la session et actualise son activite au plus une fois par minute.
   * Cette frequence evite une ecriture en base pour chaque requete authentifiee.
   */
  async validerEtActualiserActivite(
    sessionId: string,
    utilisateurId: string,
  ): Promise<boolean> {
    const maintenant = new Date();
    const session = await this.sessionRepo.findOne({
      where: {
        id: sessionId,
        utilisateurId,
        dateRevocation: IsNull(),
        dateExpiration: MoreThan(maintenant),
      },
      select: ['id', 'derniereActivite'],
    });

    if (!session) return false;

    const seuil = new Date(
      maintenant.getTime() - SessionsService.INTERVALLE_MAJ_ACTIVITE_MS,
    );
    if (session.derniereActivite < seuil) {
      await this.sessionRepo.update(
        {
          id: sessionId,
          utilisateurId,
          dateRevocation: IsNull(),
          dateExpiration: MoreThan(maintenant),
          derniereActivite: LessThan(seuil),
        },
        { derniereActivite: maintenant },
      );
    }
    return true;
  }

  /**
   * Trouve une session active par le hash du refresh token.
   */
  async trouverParRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<UserSession | null> {
    return this.sessionRepo.findOne({
      where: {
        refreshTokenHash,
        dateRevocation: IsNull(),
        dateExpiration: MoreThan(new Date()),
      },
    });
  }

  /**
   * Liste toutes les sessions actives d'un utilisateur, ordonnees par activite recente.
   */
  async listerSessionsUtilisateur(
    utilisateurId: string,
    currentSessionId?: string,
  ): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepo.find({
      where: {
        utilisateurId,
        dateRevocation: IsNull(),
        dateExpiration: MoreThan(new Date()),
      },
      order: {
        derniereActivite: 'DESC',
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      typeAppareil: s.typeAppareil,
      navigateur: s.navigateur,
      systemeExploitation: s.systemeExploitation,
      adresseIp: s.adresseIp,
      dateCreation: s.dateCreation,
      derniereActivite: s.derniereActivite,
      dateExpiration: s.dateExpiration,
      estActuelle: Boolean(currentSessionId && s.id === currentSessionId),
    }));
  }

  /**
   * Retourne la session actuelle de l'utilisateur connecte.
   */
  async obtenirSessionActuelle(
    utilisateurId: string,
    currentSessionId?: string,
  ): Promise<SessionResponseDto> {
    if (!currentSessionId) {
      throw new NotFoundException('Session courante non identifiée');
    }

    const session = await this.sessionRepo.findOne({
      where: {
        id: currentSessionId,
        utilisateurId,
        dateRevocation: IsNull(),
        dateExpiration: MoreThan(new Date()),
      },
    });

    if (!session) {
      throw new NotFoundException('Session courante introuvable ou expirée');
    }

    return {
      id: session.id,
      typeAppareil: session.typeAppareil,
      navigateur: session.navigateur,
      systemeExploitation: session.systemeExploitation,
      adresseIp: session.adresseIp,
      dateCreation: session.dateCreation,
      derniereActivite: session.derniereActivite,
      dateExpiration: session.dateExpiration,
      estActuelle: true,
    };
  }

  /**
   * Revoque une session specifique d'un utilisateur.
   * Controle strict de propriete : un utilisateur ne peut jamais revoquer la session d'un autre.
   */
  async revoquerSession(sessionId: string, utilisateurId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable');
    }

    if (session.utilisateurId !== utilisateurId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas révoquer la session d’un autre utilisateur',
      );
    }

    if (session.dateRevocation) {
      return; // Deja revoquee
    }

    await this.sessionRepo.update(
      { id: sessionId, utilisateurId },
      { dateRevocation: new Date() },
    );

    this.logger.log(
      `Session ${sessionId} revoquee pour l'utilisateur ${utilisateurId}`,
    );
  }

  /**
   * Revoque toutes les autres sessions de l'utilisateur (sauf la session courante).
   */
  async revoquerAutresSessions(
    utilisateurId: string,
    currentSessionId?: string,
  ): Promise<{ message: string; revoquees: number }> {
    if (!currentSessionId) {
      throw new BadRequestException('Session actuelle non identifiée');
    }

    const resultat = await this.sessionRepo.update(
      {
        utilisateurId,
        id: Not(currentSessionId),
        dateRevocation: IsNull(),
      },
      { dateRevocation: new Date() },
    );

    const count = resultat.affected ?? 0;
    this.logger.log(
      `${count} autre(s) session(s) revoquee(s) pour l'utilisateur ${utilisateurId}`,
    );

    return {
      message: 'Toutes les autres sessions ont été révoquées avec succès',
      revoquees: count,
    };
  }

  /**
   * Revoque toutes les sessions de l'utilisateur (utilitaire pour mot de passe change ou vol).
   */
  async revoquerToutesSessions(
    utilisateurId: string,
  ): Promise<{ message: string; revoquees: number }> {
    const resultat = await this.sessionRepo.update(
      {
        utilisateurId,
        dateRevocation: IsNull(),
      },
      { dateRevocation: new Date() },
    );

    const count = resultat.affected ?? 0;
    this.logger.log(
      `Toutes les sessions (${count}) ont ete revoquees pour l'utilisateur ${utilisateurId}`,
    );

    return {
      message: 'Toutes les sessions ont été révoquées avec succès',
      revoquees: count,
    };
  }

  /**
   * Nettoie les sessions expirees ou revoquees depuis plus de 30 jours (maintenance).
   */
  async nettoyerSessionsExpirees(): Promise<void> {
    const dateLimite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.sessionRepo.delete({
      dateExpiration: LessThan(dateLimite),
    });
  }
}

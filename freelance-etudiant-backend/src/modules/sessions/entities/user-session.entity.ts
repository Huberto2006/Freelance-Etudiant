import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

/**
 * Entite UserSession : represente une session active d'un utilisateur connecte.
 * Permet a l'utilisateur de consulter ses appareils connectes, d'identifier
 * sa session courante et de revoquer une ou plusieurs sessions a distance.
 *
 * La cle etrangere vers Utilisateur est supprimee en cascade (onDelete: CASCADE).
 * Le hash du refresh token (SHA-256) lie la session physique au jeton de renouvellement.
 */
@Entity('user_sessions')
@Index('IDX_user_sessions_utilisateur', ['utilisateurId'])
@Index('IDX_user_sessions_utilisateur_actif', ['utilisateurId', 'dateRevocation', 'dateExpiration'])
@Index('IDX_user_sessions_token_hash', ['refreshTokenHash'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur!: Utilisateur;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId!: string;

  /** Empreinte SHA-256 du refresh token actuellement actif pour cette session. */
  @Column({ name: 'refresh_token_hash', type: 'varchar', length: 64 })
  refreshTokenHash!: string;

  /** Type d'appareil : desktop, mobile, tablette, inconnu. */
  @Column({ name: 'type_appareil', type: 'varchar', length: 30, default: 'inconnu' })
  typeAppareil!: string;

  /** Nom et version du navigateur (ex. Chrome 122, Firefox 124, Safari 17). */
  @Column({ name: 'navigateur', type: 'varchar', length: 100, default: 'Inconnu' })
  navigateur!: string;

  /** Systeme d'exploitation (ex. Windows 10/11, macOS, Ubuntu Linux, Android 14, iOS 17). */
  @Column({ name: 'systeme_exploitation', type: 'varchar', length: 100, default: 'Inconnu' })
  systemeExploitation!: string;

  /** Adresse IP du client avec masquage de confidentialite (ex. 197.149.230.***). */
  @Column({ name: 'adresse_ip', type: 'varchar', length: 64, default: 'Inconnue' })
  adresseIp!: string;

  /** User-Agent brut raccourci (facultatif, pour audit ou precision). */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  /** Date d'emission de la session. */
  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;

  /** Derniere activite enregistree (mise a jour a chaque rafraichissement ou requete). */
  @Column({ name: 'derniere_activite', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  derniereActivite!: Date;

  /** Date d'expiration de la session (au-dela, la session ne peut plus etre renouvelee). */
  @Column({ name: 'date_expiration', type: 'timestamptz' })
  dateExpiration!: Date;

  /** Date de revocation explicite (si definie, la session est immediatement invalide). */
  @Column({ name: 'date_revocation', type: 'timestamptz', nullable: true })
  dateRevocation!: Date | null;
}

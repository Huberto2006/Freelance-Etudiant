import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { Mission } from '../../missions/entities/mission.entity';
import { Groupe } from '../../groupes/entities/groupe.entity';

/**
 * Table Message (cf. 5.2 Messagerie Integree).
 * Deux formes :
 * - message individuel : expediteur -> destinataire (groupe_id NULL),
 *   optionnellement rattache a une mission pour donner le contexte de la
 *   conversation ;
 * - message de groupe : expediteur -> groupe (destinataire_id NULL),
 *   stocke UNE SEULE fois, lecture suivie dans message_groupe_lectures.
 */
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  contenu: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expediteur_id' })
  expediteur: Utilisateur;

  @Column({ name: 'expediteur_id' })
  expediteurId: string;

  /**
   * NULL pour un message de groupe (seul groupe_id est renseigne).
   */
  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'destinataire_id' })
  destinataire?: Utilisateur | null;

  @Column({ name: 'destinataire_id', type: 'uuid', nullable: true })
  destinataireId?: string | null;

  @ManyToOne(() => Mission, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mission_id' })
  mission?: Mission;

  @Column({ name: 'mission_id', nullable: true })
  missionId?: string;

  /**
   * Groupe destinataire (NULL pour un message individuel). La suppression
   * du groupe entraine celle de sa conversation (et des lectures associees
   * via le message).
   */
  @ManyToOne(() => Groupe, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'groupe_id' })
  groupe?: Groupe | null;

  @Column({ name: 'groupe_id', type: 'uuid', nullable: true })
  groupeId?: string | null;

  @Column({ type: 'boolean', name: 'est_lu', default: false })
  estLu: boolean;

  /**
   * Suppression LOGIQUE (tombstone) : le contenu reste en base afin de
   * conserver l'ordre et l'historique de la conversation, mais il est
   * masque a l'affichage pour les deux participants ("Message supprime").
   * Seul l'expediteur d'un message peut le supprimer.
   */
  @Column({ name: 'est_supprime', type: 'boolean', default: false })
  estSupprime: boolean;

  /** Utilisateur ayant supprime le message (toujours l'expediteur). */
  @Column({ name: 'supprime_par_id', type: 'uuid', nullable: true })
  supprimeParId?: string | null;

  @Column({ name: 'piece_jointe_url', type: 'varchar', length: 300, nullable: true })
  pieceJointeUrl?: string | null;

  @Column({ name: 'piece_jointe_nom', type: 'varchar', length: 255, nullable: true })
  pieceJointeNom?: string | null;

  @CreateDateColumn({ name: 'date_envoi', type: 'timestamptz' })
  dateEnvoi: Date;
}

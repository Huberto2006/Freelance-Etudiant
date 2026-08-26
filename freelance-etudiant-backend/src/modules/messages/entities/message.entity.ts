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

/**
 * Table Message (cf. 5.2 Messagerie Integree).
 * Echanges directs Client <-> Etudiant, optionnellement rattaches a une
 * mission pour donner le contexte de la conversation.
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

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destinataire_id' })
  destinataire: Utilisateur;

  @Column({ name: 'destinataire_id' })
  destinataireId: string;

  @ManyToOne(() => Mission, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mission_id' })
  mission?: Mission;

  @Column({ name: 'mission_id', nullable: true })
  missionId?: string;

  @Column({ type: 'boolean', name: 'est_lu', default: false })
  estLu: boolean;

  @Column({ name: 'piece_jointe_url', type: 'varchar', length: 300, nullable: true })
  pieceJointeUrl?: string | null;

  @Column({ name: 'piece_jointe_nom', type: 'varchar', length: 255, nullable: true })
  pieceJointeNom?: string | null;

  @CreateDateColumn({ name: 'date_envoi', type: 'timestamptz' })
  dateEnvoi: Date;
}

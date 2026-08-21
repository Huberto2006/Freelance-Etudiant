import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeNotification } from '../../../common/enums/type-notification.enum';

/**
 * Table Notification : evenements in-app destines a un utilisateur
 * (nouvelle candidature, message, livraison, paiement, reaction...).
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TypeNotification })
  type: TypeNotification;

  @Column({ type: 'varchar', length: 150 })
  titre: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'lien_url', type: 'varchar', length: 300, nullable: true })
  lienUrl?: string;

  @Column({ name: 'est_lue', type: 'boolean', default: false })
  @Index()
  estLue: boolean;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'destinataire_id' })
  destinataire: Utilisateur;

  @Column({ name: 'destinataire_id' })
  @Index()
  destinataireId: string;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}

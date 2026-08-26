import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import {
  StatutSignalement,
  CibleSignalement,
} from '../../../common/enums/statut-signalement.enum';

/**
 * Table Signalement (cf. 2.3 Gestion des litiges et signalements).
 * RG11 : un signalement doit etre traite par un administrateur avant cloture.
 */
@Entity('signalements')
export class Signalement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  motif: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'cible_type', type: 'enum', enum: CibleSignalement })
  cibleType: CibleSignalement;

  @Column({ name: 'cible_id', type: 'uuid' })
  cibleId: string;

  @Column({
    type: 'enum',
    enum: StatutSignalement,
    default: StatutSignalement.OUVERT,
  })
  statut: StatutSignalement;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signale_par_id' })
  signalePar: Utilisateur;

  @Column({ name: 'signale_par_id' })
  signaleParId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'traite_par_id' })
  traitePar?: Utilisateur;

  @Column({ name: 'traite_par_id', nullable: true })
  traiteParId?: string;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution?: string;

  @CreateDateColumn({ name: 'date_signalement', type: 'timestamptz' })
  dateSignalement: Date;

  @Column({ name: 'date_traitement', type: 'timestamptz', nullable: true })
  dateTraitement?: Date;
}

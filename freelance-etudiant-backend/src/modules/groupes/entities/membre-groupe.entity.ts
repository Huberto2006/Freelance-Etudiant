import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Groupe } from './groupe.entity';
import { EtudiantProfile } from '../../etudiants/entities/etudiant-profile.entity';

@Entity('membres_groupes')
@Unique('uq_membre_groupe_etudiant', ['groupeId', 'etudiantId'])
export class MembreGroupe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Groupe, (groupe) => groupe.membres, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupe_id' })
  groupe!: Groupe;

  @Column({ name: 'groupe_id' })
  groupeId!: string;

  @ManyToOne(() => EtudiantProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant!: EtudiantProfile;

  @Column({ name: 'etudiant_id' })
  etudiantId!: string;

  /**
   * Exemple :
   * - chef
   * - membre
   */
  @Column({ type: 'varchar', length: 50, default: 'membre' })
  role!: string;

  @CreateDateColumn({ name: 'date_adhesion', type: 'timestamptz' })
  dateAdhesion!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { EtudiantProfile } from '../../etudiants/entities/etudiant-profile.entity';
import { Mission } from '../../missions/entities/mission.entity';
import { MembreGroupe } from './membre-groupe.entity';
import { InvitationGroupe } from './invitation-groupe.entity';
import { Candidature } from '@/modules/candidatures/entities/candidature.entity';

@Entity('groupes')
export class Groupe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nom!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Étudiant ayant créé le groupe.
   */
  @ManyToOne(() => EtudiantProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'createur_id' })
  createur!: EtudiantProfile;

  @Column({ name: 'createur_id' })
  createurId!: string;

  /**
   * Une mission peut être associée au groupe,
   * mais ce n'est pas obligatoire.
   */
  @ManyToOne(() => Mission, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'mission_id' })
  mission!: Mission | null;

  @Column({ name: 'mission_id', nullable: true })
  missionId!: string | null;

  @OneToMany(() => MembreGroupe, (membre) => membre.groupe)
  membres!: MembreGroupe[];

  @OneToMany(() => InvitationGroupe, (invitation) => invitation.groupe)
  invitations!: InvitationGroupe[];

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;

  @OneToMany(() => Candidature, (candidature) => candidature.groupe)
  candidatures!: Candidature[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  OneToOne,
} from 'typeorm';

import { Mission } from '../../missions/entities/mission.entity';
import { EtudiantProfile } from '../../etudiants/entities/etudiant-profile.entity';
import { Groupe } from '../../groupes/entities/groupe.entity';
import { StatutCandidature } from '../../../common/enums/statut-candidature.enum';
import { Livraison } from '../../livraisons/entities/livraison.entity';


@Entity('candidatures')
@Unique('uq_candidature_mission_etudiant', ['missionId', 'etudiantId'])
export class Candidature {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'prix_propose',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  prixPropose!: number;

  @Column({
    name: 'delai_propose',
    type: 'int',
  })
  delaiPropose!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  message?: string;

  @Column({
    type: 'enum',
    enum: StatutCandidature,
    default: StatutCandidature.EN_ATTENTE,
  })
  statut!: StatutCandidature;

  /**
   * Mission concernée par la candidature.
   */
  @ManyToOne(() => Mission, (mission) => mission.candidatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mission_id' })
  mission!: Mission;

  @Column({ name: 'mission_id' })
  missionId!: string;

  /**
   * Étudiant qui dépose la candidature.
   *
   * Pour une candidature individuelle :
   *   etudiantId = étudiant candidat
   *
   * Pour une candidature de groupe :
   *   etudiantId = chef du groupe qui dépose la candidature
   */
  @ManyToOne(() => EtudiantProfile, (etudiant) => etudiant.candidatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant!: EtudiantProfile;

  @Column({ name: 'etudiant_id' })
  etudiantId!: string;

  /**
   * Groupe candidat.
   *
   * NULL = candidature individuelle.
   * NON NULL = candidature déposée au nom d'un groupe.
   */
  @ManyToOne(() => Groupe, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'groupe_id' })
  groupe!: Groupe | null;

  @Column({
    name: 'groupe_id',
    type: 'uuid',
    nullable: true,
  })
  groupeId!: string | null;

  @OneToOne(() => Livraison, (livraison) => livraison.candidature)
  livraison?: Livraison;

  @CreateDateColumn({
    name: 'date_candidature',
    type: 'timestamptz',
  })
  dateCandidature!: Date;
}
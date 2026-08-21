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
import { StatutCandidature } from '../../../common/enums/statut-candidature.enum';
import { Livraison } from '../../livraisons/entities/livraison.entity';

/**
 * Table Candidature (cf. 5.2 Candidatures & Selection).
 * RG2 : Un etudiant ne peut envoyer qu'une seule proposition par mission
 *       -> contrainte d'unicite (mission_id, etudiant_id).
 * RG4 : statut parmi en_attente / acceptee / refusee.
 */
@Entity('candidatures')
@Unique('uq_candidature_mission_etudiant', ['missionId', 'etudiantId'])
export class Candidature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prix_propose', type: 'decimal', precision: 10, scale: 2 })
  prixPropose: number;

  @Column({ name: 'delai_propose', type: 'int' })
  delaiPropose: number;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({
    type: 'enum',
    enum: StatutCandidature,
    default: StatutCandidature.EN_ATTENTE,
  })
  statut: StatutCandidature;

  @ManyToOne(() => Mission, (mission) => mission.candidatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mission_id' })
  mission: Mission;

  @Column({ name: 'mission_id' })
  missionId: string;

  @ManyToOne(() => EtudiantProfile, (etudiant) => etudiant.candidatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant: EtudiantProfile;

  @Column({ name: 'etudiant_id' })
  etudiantId: string;

  @OneToOne(() => Livraison, (livraison) => livraison.candidature)
  livraison?: Livraison;

  @CreateDateColumn({ name: 'date_candidature', type: 'timestamptz' })
  dateCandidature: Date;
}

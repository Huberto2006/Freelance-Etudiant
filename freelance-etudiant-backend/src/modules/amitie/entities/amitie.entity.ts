import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { EtudiantProfile } from '../../etudiants/entities/etudiant-profile.entity';
import { StatutAmitie } from '../../../common/enums/statut-amitie.enum';

/**
 * Relation d'amitié entre deux étudiants, indépendante des missions,
 * candidatures et groupes.
 *
 * Une seule relation ACTIVE (en_attente ou acceptee) peut exister entre
 * deux étudiants, quelle qu'en soit la direction : l'unicité est garantie
 * en base par un index unique partiel sur la paire normalisée
 * (LEAST/GREATEST) restreinte aux statuts actifs (cf. migration
 * AddAmitie1798000000000). Une demande refusée n'occupe donc pas la
 * paire : une nouvelle demande peut être envoyée.
 */
@Entity('amities')
export class Amitie {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Étudiant qui envoie la demande d'amitié.
   */
  @ManyToOne(() => EtudiantProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'demandeur_id' })
  demandeur!: EtudiantProfile;

  @Column({ name: 'demandeur_id' })
  demandeurId!: string;

  /**
   * Étudiant qui reçoit la demande d'amitié.
   */
  @ManyToOne(() => EtudiantProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receveur_id' })
  receveur!: EtudiantProfile;

  @Column({ name: 'receveur_id' })
  receveurId!: string;

  @Column({
    type: 'enum',
    enum: StatutAmitie,
    default: StatutAmitie.EN_ATTENTE,
  })
  statut!: StatutAmitie;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;

  /**
   * Renseignée uniquement quand la demande est traitée
   * (acceptee ou refusee).
   */
  @Column({ name: 'date_reponse', type: 'timestamptz', nullable: true })
  dateReponse!: Date | null;
}

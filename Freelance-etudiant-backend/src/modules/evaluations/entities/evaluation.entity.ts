import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Livraison } from '../../livraisons/entities/livraison.entity';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

/**
 * Table Evaluation (cf. 5.2 Evaluations & Notes).
 * RG5 : un projet ne peut etre evalue qu'apres validation de la livraison.
 * RG6 : note entre 1 et 5 (contrainte CHECK + validation DTO).
 */
@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  note: number;

  @Column({ type: 'text', nullable: true })
  commentaire?: string;

  @ManyToOne(() => Livraison, (livraison) => livraison.evaluations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'livraison_id' })
  livraison: Livraison;

  @Column({ name: 'livraison_id' })
  livraisonId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluateur_id' })
  evaluateur: Utilisateur;

  @Column({ name: 'evaluateur_id' })
  evaluateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evalue_id' })
  evalue: Utilisateur;

  @Column({ name: 'evalue_id' })
  evalueId: string;

  @CreateDateColumn({ name: 'date_evaluation', type: 'timestamptz' })
  dateEvaluation: Date;
}

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
 * RG7 : une evaluation est un enregistrement de confiance permanent et ne
 *       doit jamais disparaitre par cascade lors de la suppression d'un
 *       compte (client OU etudiant, y compris via la chaine
 *       Mission -> Candidature -> Livraison). Toutes les relations sont
 *       donc en RESTRICT : un utilisateur, une candidature ou une
 *       livraison lies a une evaluation ne peuvent pas etre supprimes
 *       tant que l'evaluation existe.
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
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'livraison_id' })
  livraison: Livraison;

  @Column({ name: 'livraison_id', unique: true })
  livraisonId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'evaluateur_id' })
  evaluateur: Utilisateur;

  @Column({ name: 'evaluateur_id' })
  evaluateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'evalue_id' })
  evalue: Utilisateur;

  @Column({ name: 'evalue_id' })
  evalueId: string;

  @CreateDateColumn({ name: 'date_evaluation', type: 'timestamptz' })
  dateEvaluation: Date;
}

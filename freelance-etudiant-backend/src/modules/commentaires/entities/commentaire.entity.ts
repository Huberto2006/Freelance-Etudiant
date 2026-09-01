import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeCibleContenu } from '../../../common/enums/type-cible-contenu.enum';

/**
 * Table Commentaire : echanges publics sous une mission ou un service
 * publie (distinct des evaluations, qui portent sur une collaboration
 * terminee - cf. module evaluations).
 */
@Entity('commentaires')
export class Commentaire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  contenu: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auteur_id' })
  auteur: Utilisateur;

  @Column({ name: 'auteur_id' })
  auteurId: string;

  @Column({ name: 'cible_type', type: 'enum', enum: TypeCibleContenu })
  @Index()
  cibleType: TypeCibleContenu;

  @Column({ name: 'cible_id', type: 'uuid' })
  @Index()
  cibleId: string;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_modification', type: 'timestamptz' })
  dateModification: Date;
}

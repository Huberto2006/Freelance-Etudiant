import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeCibleContenu } from '../../../common/enums/type-cible-contenu.enum';
import { Mention } from './mention.entity';

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

  /**
   * Utilisateurs identifies via @ dans le texte du commentaire.
   *
   * Relation non chargee par defaut (aucune requete existante n'y fait
   * reference) : elle documente l'association et porte la contrainte
   * onDelete CASCADE inverse definie dans l'entite Mention.
   */
  @OneToMany(() => Mention, (mention) => mention.commentaire)
  mentions: Mention[];
}

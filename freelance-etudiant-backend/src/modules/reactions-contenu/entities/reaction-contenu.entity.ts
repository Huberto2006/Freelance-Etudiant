import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeCibleContenu } from '../../../common/enums/type-cible-contenu.enum';

export enum TypeReactionContenu {
  JAIME = 'jaime',
  JENAIMEPAS = 'jenaimepas',
}

/**
 * Table ReactionContenu : reaction 👍/👎 sur une mission ou un service
 * publie. Distincte de ReactionProfil (reaction "j'aime" sur un profil
 * utilisateur, module reactions) pour eviter toute confusion entre les
 * deux concepts.
 * RGr1 : une seule reaction active par utilisateur et par contenu
 *        (contrainte d'unicite en base) ; changer d'avis = UPDATE, pas
 *        une nouvelle ligne.
 */
@Entity('reactions_contenu')
@Unique('uq_reaction_contenu_auteur_cible', ['auteurId', 'cibleType', 'cibleId'])
export class ReactionContenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auteur_id' })
  auteur: Utilisateur;

  @Column({ name: 'auteur_id' })
  auteurId: string;

  @Column({ name: 'cible_type', type: 'enum', enum: TypeCibleContenu })
  cibleType: TypeCibleContenu;

  @Column({ name: 'cible_id', type: 'uuid' })
  cibleId: string;

  @Column({ type: 'enum', enum: TypeReactionContenu })
  type: TypeReactionContenu;

  @CreateDateColumn({ name: 'date_reaction', type: 'timestamptz' })
  dateReaction: Date;
}

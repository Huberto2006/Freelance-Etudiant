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

/**
 * Table ReactionProfil : un utilisateur connecte peut "reagir" (un pouce
 * leve, a la maniere d'un "j'aime") sur le profil public d'un autre
 * utilisateur (etudiant ou client) lorsqu'il consulte sa fiche.
 * RGr1 : un auteur ne peut avoir qu'une seule reaction active par profil
 *        cible -> contrainte d'unicite (auteur_id, cible_id).
 * RGr2 : un utilisateur ne peut pas reagir a son propre profil (verifie en
 *        service).
 */
@Entity('reactions_profil')
@Unique('uq_reaction_auteur_cible', ['auteurId', 'cibleId'])
export class ReactionProfil {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auteur_id' })
  auteur: Utilisateur;

  @Column({ name: 'auteur_id' })
  auteurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cible_id' })
  cible: Utilisateur;

  @Column({ name: 'cible_id' })
  cibleId: string;

  @CreateDateColumn({ name: 'date_reaction', type: 'timestamptz' })
  dateReaction: Date;
}

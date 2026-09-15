import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { Commentaire } from './commentaire.entity';

/**
 * Table Mention : association entre un commentaire et un utilisateur
 * identifie via @ dans le texte du commentaire.
 *
 * - Contrainte unique (commentaire_id, utilisateur_id) : eviter les
 *   doublons si le meme utilisateur est mentionne plusieurs fois dans
 *   un meme commentaire (aussi bien en creation qu'en modification).
 * - Suppression en CASCADE : la suppression d'un commentaire efface
 *   ses mentions ; la suppression d'un utilisateur effage aussi les
 *   lignes le concernant.
 */
@Entity('mentions')
@Unique('uq_mention_commentaire_utilisateur', ['commentaireId', 'utilisateurId'])
export class Mention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Commentaire, (commentaire) => commentaire.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commentaire_id' })
  commentaire: Commentaire;

  @Column({ name: 'commentaire_id' })
  commentaireId: string;

  /**
   * L'utilisateur mentionne DOIT exister : la cle etrangere vers
   * utilisateurs() garantit qu'aucune mention ne peut pointer vers un
   * utilisateur inexistant, meme si l'identifiant provient du frontend.
   */
  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'utilisateur_id' })
  @Index('IDX_mentions_utilisateur_id')
  utilisateurId: string;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}

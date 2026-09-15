import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

/**
 * Table de suivi de lecture des messages de groupe (cf. 5.2).
 *
 * Un message de groupe n'a pas de destinataire unique : chaque membre
 * materialise sa lecture par UNE ligne dans cette table. Un message de
 * groupe est donc "non lu" pour un utilisateur tant qu'il n'existe pas
 * d'enregistrement correspondant ici.
 *
 * Contrainte d'unicite (message_id, utilisateur_id) : un meme utilisateur
 * ne peut avoir qu'une seule lecture pour un meme message.
 */
@Entity('message_groupe_lectures')
@Unique('uq_message_groupe_lecture', ['messageId', 'utilisateurId'])
export class MessageGroupeLecture {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Suppression du message => suppression des lectures associees.
   */
  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'message_id' })
  messageId: string;

  /**
   * Suppression de l'utilisateur => suppression de ses lectures.
   */
  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'utilisateur_id' })
  utilisateurId: string;

  @CreateDateColumn({ name: 'date_lecture', type: 'timestamptz' })
  dateLecture: Date;
}

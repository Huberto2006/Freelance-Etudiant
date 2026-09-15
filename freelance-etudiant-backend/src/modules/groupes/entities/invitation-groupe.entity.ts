import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Groupe } from './groupe.entity';
import { EtudiantProfile } from '../../etudiants/entities/etudiant-profile.entity';
import { StatutInvitationGroupe } from '../../../common/enums/statut-invitation-groupe.enum';

@Entity('invitations_groupes')
@Unique('uq_invitation_groupe_invite', ['groupeId', 'inviteId'])
export class InvitationGroupe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Groupe, (groupe) => groupe.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupe_id' })
  groupe!: Groupe;

  @Column({ name: 'groupe_id' })
  groupeId!: string;

  /**
   * Étudiant qui envoie l'invitation.
   */
  @ManyToOne(() => EtudiantProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'inviteur_id' })
  inviteur!: EtudiantProfile;

  @Column({ name: 'inviteur_id' })
  inviteurId!: string;

  /**
   * Étudiant qui reçoit l'invitation.
   */
  @ManyToOne(() => EtudiantProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invite_id' })
  invite!: EtudiantProfile;

  @Column({ name: 'invite_id' })
  inviteId!: string;

  @Column({
    type: 'enum',
    enum: StatutInvitationGroupe,
    default: StatutInvitationGroupe.EN_ATTENTE,
  })
  statut!: StatutInvitationGroupe;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;
}

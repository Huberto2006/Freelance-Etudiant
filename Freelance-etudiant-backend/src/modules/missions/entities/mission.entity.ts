import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { Candidature } from '../../candidatures/entities/candidature.entity';
import { StatutMission } from '../../../common/enums/statut-mission.enum';

/**
 * Table Mission (cf. 5.2 Missions Clients).
 * RG3 : Une mission ne peut plus recevoir de candidature apres sa date limite.
 */
@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  titre: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget: number;

  @Column({ name: 'date_limite', type: 'date' })
  dateLimite: Date;

  @Column({ type: 'varchar', length: 50 })
  categorie: string;

  @Column({ type: 'text', array: true, default: () => "'{}'", name: 'competences_requises' })
  competencesRequises: string[];

  @Column({
    type: 'enum',
    enum: StatutMission,
    default: StatutMission.OUVERTE,
  })
  statut: StatutMission;

  @Column({ type: 'boolean', name: 'est_modere', default: true })
  estModere: boolean;

  @ManyToOne(() => ClientProfile, (client) => client.missions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: ClientProfile;

  @Column({ name: 'client_id' })
  clientId: string;

  @OneToMany(() => Candidature, (candidature) => candidature.mission)
  candidatures: Candidature[];

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}

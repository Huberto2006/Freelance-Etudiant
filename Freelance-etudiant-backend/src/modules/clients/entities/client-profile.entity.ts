import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeClient } from '../../../common/enums/type-client.enum';
import { Mission } from '../../missions/entities/mission.entity';

/**
 * Profil specifique a un utilisateur ayant le role CLIENT.
 */
@Entity('profils_clients')
export class ClientProfile {
  @PrimaryColumn('uuid', { name: 'utilisateur_id' })
  utilisateurId: string;

  @OneToOne(() => Utilisateur, (u) => u.profilClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({
    name: 'type_client',
    type: 'enum',
    enum: TypeClient,
    default: TypeClient.PARTICULIER,
  })
  typeClient: TypeClient;

  @Column({ name: 'nom_entreprise', type: 'varchar', length: 150, nullable: true })
  nomEntreprise?: string;

  @OneToMany(() => Mission, (mission) => mission.client)
  missions: Mission[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../../common/enums/role.enum';
import { EtudiantProfile } from '../../etudiants/entities/etudiant-profile.entity';
import { ClientProfile } from '../../clients/entities/client-profile.entity';

/**
 * Table Utilisateur (cf. dictionnaire des donnees, chapitre 5.2).
 * RG1 : role unique parmi etudiant / client / admin.
 * RG7 : email unique dans le systeme.
 */
@Entity('utilisateurs')
export class Utilisateur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'mot_de_passe', type: 'varchar', length: 255 })
  motDePasse: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl?: string;

  @Column({ type: 'boolean', name: 'est_actif', default: true })
  estActif: boolean;

  @Column({ type: 'boolean', name: 'est_suspendu', default: false })
  estSuspendu: boolean;

  @CreateDateColumn({ name: 'date_inscription', type: 'timestamptz' })
  dateInscription: Date;

  @OneToOne(() => EtudiantProfile, (profile) => profile.utilisateur, {
    cascade: true,
  })
  profilEtudiant?: EtudiantProfile;

  @OneToOne(() => ClientProfile, (profile) => profile.utilisateur, {
    cascade: true,
  })
  profilClient?: ClientProfile;
}

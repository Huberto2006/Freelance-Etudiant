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
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nom!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Exclude({ toPlainOnly: true })
  @Column({
    name: 'mot_de_passe',
    type: 'varchar',
    length: 255,
  })
  motDePasse!: string;

  @Column({
    type: 'enum',
    enum: Role,
  })
  role!: Role;

  // Photo commune à tous les utilisateurs
  @Column({
    name: 'photo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  photoUrl!: string | null;

  @Column({
    type: 'boolean',
    name: 'est_actif',
    default: true,
  })
  estActif!: boolean;

  @Column({
    type: 'boolean',
    name: 'est_suspendu',
    default: false,
  })
  estSuspendu!: boolean;
  /*
   * Verification de l'adresse email : un compte n'est utilisable (connexion)
   * qu'une fois son adresse confirmee via le lien envoye a l'inscription.
   * Seule l'empreinte SHA-256 du jeton est stockee (jamais le jeton en clair).
   */
  @Column({
    name: 'email_verifie',
    type: 'boolean',
    default: false,
  })
  emailVerifie!: boolean;

  @Exclude({ toPlainOnly: true })
  @Column({
    name: 'email_verification_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  emailVerificationTokenHash!: string | null;

  @Exclude({ toPlainOnly: true })
  @Column({
    name: 'email_verification_expire',
    type: 'timestamptz',
    nullable: true,
  })
  emailVerificationExpire!: Date | null;

  @Exclude({ toPlainOnly: true })
  @Column({
    name: 'reset_password_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  resetPasswordToken!: string | null;

  @Exclude({ toPlainOnly: true })
  @Column({
    name: 'reset_password_expire',
    type: 'timestamptz',
    nullable: true,
  })
  resetPasswordExpire!: Date | null;

  @CreateDateColumn({
    name: 'date_inscription',
    type: 'timestamptz',
  })
  dateInscription!: Date;

  @OneToOne(
    () => EtudiantProfile,
    (profile) => profile.utilisateur,
    {
      cascade: true,
    },
  )
  profilEtudiant?: EtudiantProfile;

  @OneToOne(
    () => ClientProfile,
    (profile) => profile.utilisateur,
    {
      cascade: true,
    },
  )
  profilClient?: ClientProfile;
}
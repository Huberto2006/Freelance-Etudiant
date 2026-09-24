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
import { AuthProvider } from '../../../common/enums/auth-provider.enum';
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
   * Pour un compte Google, l'adresse etant deja validee par Google, la
   * colonne est positionnee a true des la creation du compte.
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

  /**
   * Origine d'authentification du compte. Tous les comptes pre-existants
   * valent LOCAL (valeur par defaut posee par la migration) : leur
   * connexion email + mot de passe n'est pas alteree.
   */
  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider!: AuthProvider;

  /**
   * Identifiant du compte Google (claim `sub` du token OIDC), unique
   * et indexe lorsqu'il est present. Jamais renseigne pour un compte LOCAL.
   */
  @Index('UQ_utilisateurs_google_id', { unique: true })
  @Column({
    name: 'google_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  googleId!: string | null;

  /**
   * Profil obligatoire complete : calcule cote BACKEND uniquement
   * (ProfileCompletionService). Le frontend ne peut jamais forcer
   * cette valeur ; elle est verifiee avant l'acces au dashboard.
   */
  @Column({
    name: 'profil_complete',
    type: 'boolean',
    default: false,
  })
  profilComplete!: boolean;

  /**
   * Derniere connexion reussie (locale ou Google). Information
   * informatif, nullable pour les comptes n'ayant jamais reussi
   * de connexion.
   */
  @Column({
    name: 'derniere_connexion',
    type: 'timestamptz',
    nullable: true,
  })
  derniereConnexion!: Date | null;

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
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeMoyenPaiement } from '../enums/type-moyen-paiement.enum';

/**
 * Moyen de paiement d'un etudiant : coordonnees Mobile Money (MVola,
 * Orange Money, Airtel Money) ou compte bancaire, separees du profil
 * etudiant (RG-PAY-010 : jamais exposees via le profil public).
 *
 * RG-PAY-001 : un etudiant peut posseder plusieurs moyens de paiement.
 * RG-PAY-002 : chaque moyen appartient a un seul etudiant (FK RESTRICT,
 * meme philosophie que la piece comptable Transaction).
 * RG-PAY-003 : un seul moyen principal par etudiant (index unique
 * partiel ci-dessous, garanti au niveau base comme pour les
 * transactions actives par candidature).
 */
@Entity('moyens_paiement')
@Index('uq_moyen_paiement_principal', ['etudiantId'], {
  unique: true,
  where: 'principal = true',
})
@Index('IDX_moyens_paiement_etudiant', ['etudiantId'])
export class MoyenPaiement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant!: Utilisateur;

  @Column({ name: 'etudiant_id', type: 'uuid' })
  etudiantId!: string;

  @Column({
    type: 'enum',
    enum: TypeMoyenPaiement,
    enumName: 'moyens_paiement_type_enum',
  })
  type!: TypeMoyenPaiement;

  /** Libelle de l'operateur Mobile Money (null pour un compte bancaire). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  operateur!: string | null;

  /** Banque (obligatoire pour le type BANQUE, null sinon — RG-PAY-005). */
  @Column({ name: 'nom_banque', type: 'varchar', length: 100, nullable: true })
  nomBanque!: string | null;

  /** Numero Mobile Money ou numero de compte bancaire. */
  @Column({ type: 'varchar', length: 50 })
  numero!: string;

  /** Nom du titulaire du compte (RG-PAY-007 : obligatoire). */
  @Column({ name: 'nom_titulaire', type: 'varchar', length: 150 })
  nomTitulaire!: string;

  @Column({ type: 'boolean', default: false })
  principal!: boolean;

  /** RG-PAY-004 : un moyen desactive ne peut pas servir a un paiement. */
  @Column({ type: 'boolean', default: true })
  actif!: boolean;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj!: Date;
}

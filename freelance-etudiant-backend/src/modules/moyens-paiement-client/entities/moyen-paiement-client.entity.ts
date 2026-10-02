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
import { TypeMoyenPaiement } from '../../moyens-paiement/enums/type-moyen-paiement.enum';

/**
 * Moyen de paiement d'un CLIENT : numero Mobile Money reutilisable pour
 * payer ses candidatures acceptees, symetrique a MoyenPaiement (cote
 * etudiant). Limite a Mobile Money — voir migration 1807000000000 pour
 * le detail de cette decision.
 *
 * RG-PAY-012 : un client peut posseder plusieurs moyens de paiement, un
 * seul principal (meme mecanisme d'index unique partiel que cote
 * etudiant).
 */
@Entity('moyens_paiement_client')
@Index('uq_moyen_paiement_client_principal', ['clientId'], {
  unique: true,
  where: 'principal = true',
})
@Index('IDX_moyens_paiement_client_client', ['clientId'])
export class MoyenPaiementClient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client!: Utilisateur;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @Column({
    type: 'enum',
    enum: TypeMoyenPaiement,
    enumName: 'moyens_paiement_type_enum',
  })
  type!: TypeMoyenPaiement;

  /** Libelle de l'operateur Mobile Money. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  operateur!: string | null;

  /** Numero Mobile Money a debiter. */
  @Column({ type: 'varchar', length: 50 })
  numero!: string;

  /** Nom du titulaire du compte debite. */
  @Column({ name: 'nom_titulaire', type: 'varchar', length: 150 })
  nomTitulaire!: string;

  @Column({ type: 'boolean', default: false })
  principal!: boolean;

  /** Un moyen desactive n'est plus propose pour un nouveau paiement. */
  @Column({ type: 'boolean', default: true })
  actif!: boolean;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj!: Date;
}

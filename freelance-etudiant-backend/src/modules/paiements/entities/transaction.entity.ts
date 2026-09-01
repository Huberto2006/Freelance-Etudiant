import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Candidature } from '../../candidatures/entities/candidature.entity';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import {
  MethodePaiement,
  StatutTransaction,
} from '../../../common/enums/statut-transaction.enum';

/**
 * Table Transaction : modelise un paiement de mission via mobile money
 * (Mvola / Orange Money / Airtel Money) ou virement.
 * RGp1 : le client declare un transfert (reference), un administrateur
 *        verifie manuellement la reception (pas d'API bancaire disponible
 *        dans ce projet academique), puis les fonds sont "liberes" a la
 *        validation de la livraison correspondante.
 * RGp2 : une transaction est une piece comptable et ne doit jamais
 *        disparaitre par cascade (suppression d'un compte, d'une
 *        candidature ou d'une mission). Toutes les relations sont donc en
 *        RESTRICT.
 */
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Candidature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'candidature_id' })
  candidature: Candidature;

  @Column({ name: 'candidature_id' })
  candidatureId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client: Utilisateur;

  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant: Utilisateur;

  @Column({ name: 'etudiant_id' })
  etudiantId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  montant: number;

  @Column({ type: 'enum', enum: MethodePaiement })
  methode: MethodePaiement;

  @Column({ type: 'varchar', length: 100 })
  reference: string;

  @Column({
    type: 'enum',
    enum: StatutTransaction,
    default: StatutTransaction.EN_ATTENTE,
  })
  statut: StatutTransaction;

  /**
   * Fournisseur du paiement : 'mvola' (paiement en ligne verifie par
   * le backend aupres de l'API) ou 'manuel' (declaration d'un transfert
   * hors plateforme, verifiee par un administrateur).
   */
  @Column({ type: 'varchar', length: 30, nullable: true })
  provider?: string | null;

  /**
   * Identifiant serveur du fournisseur (serverCorrelationId MVola).
   * Cle d'idempotence : un meme webhook/polling ne peut valider deux
   * fois la meme transaction.
   */
  @Column({
    name: 'provider_correlation_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  providerCorrelationId?: string | null;

  /** Numero du payeur (paiement mobile en ligne uniquement). */
  @Column({ name: 'telephone_debite', type: 'varchar', length: 20, nullable: true })
  telephoneDebite?: string | null;

  /** Dernier statut brut renvoye par le fournisseur (traçabilite). */
  @Column({ name: 'provider_statut', type: 'varchar', length: 50, nullable: true })
  providerStatut?: string | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @Column({ name: 'date_confirmation', type: 'timestamptz', nullable: true })
  dateConfirmation?: Date;

  @Column({ name: 'date_liberation', type: 'timestamptz', nullable: true })
  dateLiberation?: Date;
}

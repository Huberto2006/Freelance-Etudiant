import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from '../../paiements/entities/transaction.entity';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

/**
 * Facture d'un paiement confirme.
 *
 * - Une seule facture par transaction (index unique) : generation
 *   idempotente, meme en cas de requetes concurrentes.
 * - Piece comptable : toutes les relations sont en RESTRICT, et les
 *   donnees affichees (parties, mission, montant) sont COPIEES au moment
 *   de l'emission. Modifier ensuite un profil ou une mission ne change
 *   jamais une facture deja emise.
 * - Numerotation `KJ-FAC-AAAA-NNNNNN`, sequence annuelle sans trou (voir
 *   FacturesService.genererPourTransaction).
 */
@Entity('factures')
@Index('uq_facture_numero', ['numero'], { unique: true })
@Index('uq_facture_transaction', ['transactionId'], { unique: true })
export class Facture {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30 })
  numero: string;

  @ManyToOne(() => Transaction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: Transaction;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client?: Utilisateur;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant?: Utilisateur;

  @Column({ name: 'etudiant_id', type: 'uuid' })
  etudiantId: string;

  /** Montant paye, en Ariary. */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (v?: number | string | null) => v,
      from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
    },
  })
  montant: number;

  @Column({ type: 'varchar', length: 5, default: 'Ar' })
  devise: string;

  /** Methode de paiement (papi, mvola, virement…). */
  @Column({ type: 'varchar', length: 30 })
  methode: string;

  /** Reference de la transaction (ex. KIANJA-XXXXXXXXXXXX). */
  @Column({ name: 'reference_paiement', type: 'varchar', length: 100 })
  referencePaiement: string;

  @Column({ name: 'titre_mission', type: 'varchar', length: 255 })
  titreMission: string;

  // ---- Snapshot des parties -------------------------------------------

  @Column({ name: 'client_nom', type: 'varchar', length: 150 })
  clientNom: string;

  @Column({ name: 'client_entreprise', type: 'varchar', length: 150, nullable: true })
  clientEntreprise?: string | null;

  @Column({ name: 'client_email', type: 'varchar', length: 150 })
  clientEmail: string;

  @Column({ name: 'etudiant_nom', type: 'varchar', length: 150 })
  etudiantNom: string;

  /** Emetteur (plateforme) : nom et mentions legales copies de la config. */
  @Column({ name: 'emetteur_nom', type: 'varchar', length: 150 })
  emetteurNom: string;

  @Column({ name: 'emetteur_mention', type: 'text', nullable: true })
  emetteurMention?: string | null;

  @Column({ name: 'date_paiement', type: 'timestamptz' })
  datePaiement: Date;

  @CreateDateColumn({ name: 'date_emission', type: 'timestamptz' })
  dateEmission: Date;
}

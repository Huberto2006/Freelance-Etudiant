import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Journal des notifications fournisseur dont la signature est valide (les
 * signatures refusees ne sont pas stockees : corps non authentifie) : piece
 * d'audit en ajout seul. Ne contient aucun secret (ni signature, ni jeton).
 */
@Entity('evenements_paiement')
@Index('idx_evenements_paiement_reference', ['reference'])
export class EvenementPaiement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 'papi' ou 'mvola'. */
  @Column({ type: 'varchar', length: 20 })
  fournisseur: string;

  /** Reference marchande annoncee par la notification. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  reference?: string | null;

  /** Reference fournisseur annoncee (UUID Papi, serverCorrelationId MVola). */
  @Column({ name: 'reference_fournisseur', type: 'varchar', length: 100, nullable: true })
  referenceFournisseur?: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId?: string | null;

  /** Statut annonce par le corps (jamais cru tel quel). */
  @Column({ name: 'statut_annonce', type: 'varchar', length: 30, nullable: true })
  statutAnnonce?: string | null;

  @Column({ name: 'montant_annonce', type: 'varchar', length: 30, nullable: true })
  montantAnnonce?: string | null;

  /** Issue du traitement : confirmed, cancelled, pending, ignored, rejet:<motif>... */
  @Column({ type: 'varchar', length: 60 })
  resultat: string;

  /** Code HTTP renvoye au fournisseur. */
  @Column({ name: 'code_http', type: 'int' })
  codeHttp: number;

  @CreateDateColumn({ name: 'recu_le', type: 'timestamptz' })
  recuLe: Date;
}

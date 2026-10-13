import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Compteur de numerotation des factures, une ligne par annee. Incremente
 * de facon atomique DANS la transaction SQL qui insere la facture : si
 * l'insertion echoue, l'increment est annule (aucun numero perdu).
 */
@Entity('facture_compteurs')
export class FactureCompteur {
  @PrimaryColumn({ type: 'int' })
  annee: number;

  @Column({ type: 'int', default: 0 })
  dernier: number;
}

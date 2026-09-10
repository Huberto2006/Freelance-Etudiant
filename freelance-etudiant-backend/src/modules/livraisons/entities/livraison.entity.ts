import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Candidature } from '../../candidatures/entities/candidature.entity';
import { StatutLivraison } from '../../../common/enums/statut-livraison.enum';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';

/**
 * Piece jointe d'une livraison de type "Fichiers". Le backend ne stocke
 * pas les fichiers lui-meme : chaque piece est deja envoyee a
 * POST /uploads/document et seule la metadonnee (URL relative + nom
 * original + taille) est persistee ici pour l'affichage/telechargement.
 */
export interface PieceJointeLivraison {
  url: string;
  nom: string;
  tailleOctets?: number;
}

/**
 * Table Livraison : materialise le cas d'utilisation "Livrer le projet" /
 * "Valider le projet livre" (chapitre 5.5 du document d'analyse).
 * RG8 : un etudiant ne peut livrer que pour une candidature acceptee.
 * RG5 / RG12 : un projet ne peut etre evalue qu'apres validation par le
 * client qui a publie la mission correspondante.
 */
@Entity('livraisons')
export class Livraison {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Candidature, (candidature) => candidature.livraison, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidature_id' })
  candidature!: Candidature;

  @Column({ name: 'candidature_id' })
  candidatureId!: string;

  @Column({ name: 'fichier_url', type: 'varchar', length: 500, nullable: true })
  fichierUrl?: string;

  /**
   * Livraisons de type "Fichiers" : tableau de pieces jointes deja
   * uploadees via POST /uploads/document (voir PieceJointeLivraison).
   * Nullable : les livraisons par lien de depot (GitHub/GitLab) et les
   * livraisons anterieures a cette colonne restent sans pieces jointes.
   */
  @Column({ name: 'pieces_jointes', type: 'jsonb', nullable: true })
  piecesJointes?: PieceJointeLivraison[] | null;

  @Column({ name: 'lien_livrable', type: 'varchar', length: 500, nullable: true })
  lienLivrable?: string;

  @Column({ type: 'text', nullable: true })
  commentaireLivraison?: string;

  @Column({
    type: 'enum',
    enum: StatutLivraison,
    default: StatutLivraison.EN_ATTENTE,
  })
  statut!: StatutLivraison;

  @Column({ name: 'commentaire_correction', type: 'text', nullable: true })
  commentaireCorrection?: string;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.livraison)
  evaluations!: Evaluation[];

  @CreateDateColumn({ name: 'date_livraison', type: 'timestamptz' })
  dateLivraison!: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj!: Date;
}

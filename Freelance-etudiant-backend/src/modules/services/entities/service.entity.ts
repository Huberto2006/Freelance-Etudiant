import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EtudiantProfile } from '../../etudiants/entities/etudiant-profile.entity';

/**
 * Table Service (cf. 5.2 Services Freelance).
 * RG10 : Un service publie par un etudiant reste visible tant que sa
 * disponibilite est active.
 */
@Entity('services')
export class ServiceOffert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  titre: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  categorie: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  prix: number;

  @Column({ type: 'int', comment: 'delai de realisation en jours' })
  delai: number;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  competences: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'", name: 'images_urls' })
  imagesUrls: string[];

  @Column({ type: 'boolean', default: true })
  disponible: boolean;

  @Column({ type: 'boolean', name: 'est_modere', default: true })
  estModere: boolean;

  @ManyToOne(() => EtudiantProfile, (etudiant) => etudiant.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant: EtudiantProfile;

  @Column({ name: 'etudiant_id' })
  etudiantId: string;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

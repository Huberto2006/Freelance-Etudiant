import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { ServiceOffert } from '../../services/entities/service.entity';
import { Candidature } from '../../candidatures/entities/candidature.entity';

@Entity('profils_etudiants')
export class EtudiantProfile {
  @PrimaryColumn('uuid', { name: 'utilisateur_id' })
  utilisateurId!: string;

  @OneToOne(() => Utilisateur, (u) => u.profilEtudiant, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur!: Utilisateur;

  @Column({
    name: 'niveau_etude',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  niveauEtude!: string | null;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  universite!: string | null;

  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  competences!: string[];

  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  langues!: string[];

  @Column({
    name: 'tarif_horaire',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  tarifHoraire?: number;

  @Column({
    type: 'boolean',
    default: true,
  })
  disponibilite!: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
    name: 'portfolio_urls',
  })
  portfolioUrls!: string[];

  @Column({
    name: 'score_reputation',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  scoreReputation!: number;

  @Column({
    name: 'note_moyenne',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  noteMoyenne!: number;

  @Column({
    name: 'nombre_missions_terminees',
    type: 'int',
    default: 0,
  })
  nombreMissionsTerminees!: number;

  @OneToMany(() => ServiceOffert, (service) => service.etudiant)
  services!: ServiceOffert[];

  @OneToMany(() => Candidature, (candidature) => candidature.etudiant)
  candidatures!: Candidature[];
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeCibleFavori } from '../../../common/enums/type-cible-favori.enum';

/**
 * Table Favori : un utilisateur peut sauvegarder une mission, un service ou
 * un profil etudiant pour le retrouver facilement plus tard.
 */
@Entity('favoris')
@Unique('uq_favori_utilisateur_cible', ['utilisateurId', 'cibleType', 'cibleId'])
export class Favori {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'utilisateur_id' })
  utilisateurId: string;

  @Column({ name: 'cible_type', type: 'enum', enum: TypeCibleFavori })
  cibleType: TypeCibleFavori;

  @Column({ name: 'cible_id', type: 'uuid' })
  cibleId: string;

  @CreateDateColumn({ name: 'date_ajout', type: 'timestamptz' })
  dateAjout: Date;
}

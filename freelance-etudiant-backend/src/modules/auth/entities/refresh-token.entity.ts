import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

/**
 * Refresh token emis (une ligne par session). Seule l'empreinte SHA-256 du
 * jeton est stockee. Le jeton est a usage unique (rotation) : l'echange
 * contre un nouveau couple le revoque. La reutilisation d'un jeton deja
 * revoque (vol probable) revoque toutes les sessions de l'utilisateur.
 * `id` correspond au claim `jti` du JWT.
 */
@Entity('refresh_tokens')
@Index('IDX_refresh_tokens_utilisateur', ['utilisateurId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur!: Utilisateur;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'date_expiration', type: 'timestamptz' })
  dateExpiration!: Date;

  @Column({ name: 'revoque_le', type: 'timestamptz', nullable: true })
  revoqueLe!: Date | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation!: Date;
}

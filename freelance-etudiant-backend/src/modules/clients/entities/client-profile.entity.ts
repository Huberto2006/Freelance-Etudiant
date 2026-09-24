import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeClient } from '../../../common/enums/type-client.enum';
import { Mission } from '../../missions/entities/mission.entity';

/**
 * Profil specifique a un utilisateur ayant le role CLIENT.
 */
@Entity('profils_clients')
export class ClientProfile {
  @PrimaryColumn('uuid', { name: 'utilisateur_id' })
  utilisateurId?: string;

  @OneToOne(() => Utilisateur, (u) => u.profilClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur?: Utilisateur;

  @Column({
    name: 'type_client',
    type: 'enum',
    enum: TypeClient,
    default: TypeClient.PARTICULIER,
  })
  typeClient?: TypeClient;

  @Column({ name: 'nom_entreprise', type: 'varchar', length: 150, nullable: true })
  nomEntreprise?: string;

  /**
   * Secteur d'activite de l'entreprise ou du particulier (ex. commerce,
   * education, tourisme). Optionnel, demande dans le questionnaire client.
   */
  @Column({
    name: 'secteur_activite',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  secteurActivite?: string | null;

  /**
   * Presentation de l'entreprise / du projet. Optionnel.
   */
  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string | null;

  /**
   * Ville du client. Optionnel.
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  ville?: string | null;

  /**
   * Numero de telephone. Optionnel, jamais affiche publiquement sans
   * consentement (usage de mise en relation).
   */
  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  telephone?: string | null;

  /**
   * Site web / URL professionnelle. Optionnel.
   */
  @Column({
    name: 'site_web',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  siteWeb?: string | null;

  /**
   * Fourchette de budget habituelle (Ariary). Optionnelle.
   */
  @Column({
    name: 'budget_min',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  budgetMin?: number;

  @Column({
    name: 'budget_max',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  budgetMax?: number;

  /**
   * Types de projets habituellement confies (ex. site vitrine, application
   * mobile, design graphique). Optionnel, tableau de chaines libres.
   */
  @Column({
    name: 'types_projets',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  typesProjets!: string[];

  /**
   * Besoins freelance récurrents (ex. developpement, redaction, maintenance).
   * Optionnel.
   */
  @Column({
    name: 'besoins_freelance',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  besoinsFreelance!: string[];

  /**
   * Nombre de projets deja realises ou prevus. Optionnel (0 par defaut).
   */
  @Column({
    name: 'nombre_projets',
    type: 'int',
    default: 0,
  })
  nombreProjets?: number;

  @OneToMany(() => Mission, (mission) => mission.client)
  missions?: Mission[];
}

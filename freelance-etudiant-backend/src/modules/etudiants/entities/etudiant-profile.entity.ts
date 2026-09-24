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
import { Groupe } from '../../groupes/entities/groupe.entity';
import { MembreGroupe } from '../../groupes/entities/membre-groupe.entity';
import { InvitationGroupe } from '../../groupes/entities/invitation-groupe.entity';

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

  /**
   * Filiere de formation (ex. Informatique, Gestion). Optionnel,
   * demande dans l'etape Formation du questionnaire etudiant.
   */
  @Column({
    name: 'filiere',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  filiere!: string | null;

  /**
   * Annee d'etude en cours (ex. "L1", "M2"). Optionnel.
   */
  @Column({
    name: 'annee_etude',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  anneeEtude!: string | null;

  /**
   * Ville de residence (ex. Fianarantsoa). Optionnel.
   */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  ville!: string | null;

  /**
   * Numero de telephone. Optionnel, jamais affiche publiquement sans
   * consentement de l'etudiant (usage de mise en relation).
   */
  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  telephone!: string | null;

  /**
   * Specialites / domaines d'intervention principaux (distinct des
   * competences techniques detaillees). Optionnel.
   */
  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  specialites!: string[];

  /**
   * Experience professionnelle en annees. Optionnel (0 par defaut).
   */
  @Column({
    name: 'experience',
    type: 'int',
    default: 0,
  })
  experience!: number;

  /**
   * Mode d'exercice du freelance (ex. temps partiel, mission ponctuelle,
   * temps plein). Optionnel, libre.
   */
  @Column({
    name: 'type_freelance',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  typeFreelance!: string | null;

  /**
   * Statut de disponibilite detaille (ex. "disponible", "occupe",
   * "en mission", "indisponible"). Complement de la colonne
   * disponibilite (boolean) existante, qui reste inchangee.
   */
  @Column({
    name: 'statut_disponibilite',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  statutDisponibilite!: string | null;

  /**
   * Fourchette de tarifs (en Ariary par heure). Complement optionnel de
   * tarifHoraire ; le couple min/max reste nullable.
   */
  @Column({
    name: 'tarif_minimum',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  tarifMinimum?: number;

  @Column({
    name: 'tarif_maximum',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  tarifMaximum?: number;

  // ---- Liens externes / portfolio ----

  @Column({
    name: 'github_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  githubUrl!: string | null;

  @Column({
    name: 'gitlab_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  gitlabUrl!: string | null;

  @Column({
    name: 'linkedin_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  linkedinUrl!: string | null;

  @Column({
    name: 'site_web',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  siteWeb!: string | null;

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

  @OneToMany(() => Groupe, (groupe) => groupe.createur)
  groupesCrees!: Groupe[];

  @OneToMany(() => MembreGroupe, (membre) => membre.etudiant)
  membresGroupes!: MembreGroupe[];

  @OneToMany(() => InvitationGroupe, (invitation) => invitation.inviteur)
  invitationsGroupesEnvoyees!: InvitationGroupe[];

  @OneToMany(() => InvitationGroupe, (invitation) => invitation.invite)
  invitationsGroupesRecues!: InvitationGroupe[];
}
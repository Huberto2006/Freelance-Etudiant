import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ServiceOffert } from '../../services/entities/service.entity';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { Mission } from '../../missions/entities/mission.entity';
import { StatutDemandeService } from '../../../common/enums/statut-demande-service.enum';

/**
 * Table DemandeService (commande d'un service par un client) :
 * RGds1 : un client peut demander un service publie par un etudiant en
 *         fournissant un cahier des charges detaille (besoins du projet).
 * RGds2 : l'etudiant proprietaire du service accepte ou refuse la demande.
 * RGds3 : une fois acceptee, une mission privee est generee automatiquement
 *         pour reutiliser tout le cycle existant (livraison, paiement,
 *         messagerie).
 */
@Entity('demandes_service')
export class DemandeService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceOffert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: ServiceOffert;

  @Column({ name: 'service_id' })
  serviceId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Utilisateur;

  @Column({ name: 'client_id' })
  clientId: string;

  /**
   * Cahier des charges : description complete des besoins du projet
   * (contexte, livrables attendus, contraintes...).
   */
  @Column({ name: 'cahier_des_charges', type: 'text' })
  cahierDesCharges: string;

  @Column({ name: 'budget_propose', type: 'decimal', precision: 10, scale: 2 })
  budgetPropose: number;

  @Column({ name: 'delai_souhaite', type: 'int', comment: 'en jours' })
  delaiSouhaite: number;

  @Column({ name: 'piece_jointe_url', type: 'varchar', length: 300, nullable: true })
  pieceJointeUrl?: string | null;

  @Column({ name: 'piece_jointe_nom', type: 'varchar', length: 255, nullable: true })
  pieceJointeNom?: string | null;

  @Column({
    type: 'enum',
    enum: StatutDemandeService,
    default: StatutDemandeService.EN_ATTENTE,
  })
  statut: StatutDemandeService;

  /**
   * Renseigne uniquement une fois la demande acceptee : la mission privee
   * generee pour porter le suivi du projet (livraison, paiement...).
   */
  @ManyToOne(() => Mission, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'mission_id' })
  mission?: Mission | null;

  @Column({ name: 'mission_id', nullable: true })
  missionId?: string | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Facture } from './entities/facture.entity';
import { Transaction } from '../paiements/entities/transaction.entity';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { StatutTransaction } from '../../common/enums/statut-transaction.enum';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/** Formate un numero de facture : KJ-FAC-2026-000042. */
export function formaterNumeroFacture(annee: number, sequence: number): string {
  return `KJ-FAC-${annee}-${String(sequence).padStart(6, '0')}`;
}

@Injectable()
export class FacturesService {
  private readonly logger = new Logger(FacturesService.name);

  constructor(
    @InjectRepository(Facture)
    private readonly repo: Repository<Facture>,

    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,

    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Genere (ou retrouve) la facture d'un paiement CONFIRME ou LIBERE.
   * Idempotent : appelee plusieurs fois, ou en concurrence, elle renvoie
   * toujours la meme facture, avec un seul numero consomme.
   */
  async genererPourTransaction(transactionId: string): Promise<Facture> {
    const existante = await this.repo.findOne({ where: { transactionId } });
    if (existante) return existante;

    const transaction = await this.transactionsRepo.findOne({
      where: { id: transactionId },
      relations: ['candidature', 'candidature.mission', 'client', 'etudiant'],
    });
    if (!transaction) {
      throw new NotFoundException('Paiement introuvable');
    }
    if (
      transaction.statut !== StatutTransaction.CONFIRMEE &&
      transaction.statut !== StatutTransaction.LIBEREE
    ) {
      throw new BadRequestException(
        "Une facture n'est emise qu'apres confirmation du paiement.",
      );
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const profilClient = await manager.findOne(ClientProfile, {
          where: { utilisateurId: transaction.clientId },
        });

        const datePaiement =
          (transaction as Transaction & { dateConfirmation?: Date | null })
            .dateConfirmation ?? new Date();
        const annee = new Date().getFullYear();

        // Increment atomique ; verrou de ligne tenu jusqu'au commit.
        const lignes = (await manager.query(
          `INSERT INTO "facture_compteurs" ("annee", "dernier") VALUES ($1, 1)
           ON CONFLICT ("annee") DO UPDATE SET "dernier" = "facture_compteurs"."dernier" + 1
           RETURNING "dernier"`,
          [annee],
        )) as Array<{ dernier: number }>;
        const sequence = Number(lignes[0].dernier);

        const facture = manager.create(Facture, {
          numero: formaterNumeroFacture(annee, sequence),
          transactionId: transaction.id,
          clientId: transaction.clientId,
          etudiantId: transaction.etudiantId,
          montant: Number(transaction.montant),
          devise: 'Ar',
          methode: transaction.methode,
          referencePaiement: transaction.reference,
          titreMission: transaction.candidature?.mission?.titre ?? 'Mission',
          clientNom: transaction.client?.nom ?? 'Client',
          clientEntreprise: profilClient?.nomEntreprise ?? null,
          clientEmail: transaction.client?.email ?? '',
          etudiantNom: transaction.etudiant?.nom ?? 'Etudiant',
          emetteurNom:
            this.configService.get<string>('FACTURE_EMETTEUR_NOM')?.trim() ||
            'Kianja',
          emetteurMention:
            this.configService.get<string>('FACTURE_EMETTEUR_MENTION')?.trim() ||
            null,
          datePaiement,
        });
        return manager.save(Facture, facture);
      });
    } catch (error) {
      // Course : une autre requete a emis la facture entre-temps.
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23505'
      ) {
        const concurrente = await this.repo.findOne({ where: { transactionId } });
        if (concurrente) return concurrente;
      }
      throw error;
    }
  }

  /** Variante utilisee par le flux de paiement : ne bloque jamais la confirmation. */
  async genererSansBloquer(transactionId: string): Promise<void> {
    try {
      await this.genererPourTransaction(transactionId);
    } catch (error) {
      this.logger.error(
        `Generation de facture impossible pour la transaction ${transactionId} : ${
          error instanceof Error ? error.message : String(error)
        } (elle sera creee a la premiere consultation)`,
      );
    }
  }

  /** Controle d'acces : client payeur, etudiant beneficiaire ou administrateur. */
  private verifierAcces(
    facture: Pick<Facture, 'clientId' | 'etudiantId'>,
    user: AuthenticatedUser,
  ): void {
    if (user.role === Role.ADMIN) return;
    if (facture.clientId === user.id || facture.etudiantId === user.id) return;
    throw new ForbiddenException("Vous n'avez pas acces a cette facture");
  }

  /** Facture d'un paiement (creee si besoin) apres controle d'acces. */
  async trouverPourTransaction(
    transactionId: string,
    user: AuthenticatedUser,
  ): Promise<Facture> {
    const transaction = await this.transactionsRepo.findOne({
      where: { id: transactionId },
      select: { id: true, clientId: true, etudiantId: true },
    });
    if (!transaction) throw new NotFoundException('Paiement introuvable');
    this.verifierAcces(transaction, user);
    return this.genererPourTransaction(transactionId);
  }

  async trouver(id: string, user: AuthenticatedUser): Promise<Facture> {
    const facture = await this.repo.findOne({ where: { id } });
    if (!facture) throw new NotFoundException('Facture introuvable');
    this.verifierAcces(facture, user);
    return facture;
  }

  /** Mes factures : payeur (client), beneficiaire (etudiant) ou toutes (admin). */
  async lister(user: AuthenticatedUser): Promise<Facture[]> {
    const where =
      user.role === Role.ADMIN
        ? {}
        : user.role === Role.ETUDIANT
          ? { etudiantId: user.id }
          : { clientId: user.id };
    return this.repo.find({ where, order: { dateEmission: 'DESC' } });
  }
}

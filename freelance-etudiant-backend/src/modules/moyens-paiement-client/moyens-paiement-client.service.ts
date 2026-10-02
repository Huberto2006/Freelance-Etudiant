import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MoyenPaiementClient } from './entities/moyen-paiement-client.entity';
import { CreateMoyenPaiementClientDto } from './dto/create-moyen-paiement-client.dto';
import { UpdateMoyenPaiementClientDto } from './dto/update-moyen-paiement-client.dto';
import { OPERATEURS_PAR_DEFAUT } from '../moyens-paiement/enums/type-moyen-paiement.enum';

/**
 * CRUD des moyens de paiement du CLIENT (RG-PAY-012), symetrique a
 * MoyensPaiementService cote etudiant. Permet d'enregistrer un ou
 * plusieurs numeros Mobile Money a reutiliser pour payer, au lieu de
 * retaper le numero a chaque paiement.
 */
@Injectable()
export class MoyensPaiementClientService {
  constructor(
    @InjectRepository(MoyenPaiementClient)
    private readonly repo: Repository<MoyenPaiementClient>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    clientId: string,
    dto: CreateMoyenPaiementClientDto,
  ): Promise<MoyenPaiementClient> {
    const existants = await this.repo.find({ where: { clientId } });
    const principalDemande = dto.principal ?? existants.length === 0;

    const moyen = this.repo.create({
      clientId,
      type: dto.type,
      numero: dto.numero.trim(),
      nomTitulaire: dto.nomTitulaire.trim(),
      operateur: this.operateurPour(dto.type, dto.operateur),
      principal: principalDemande,
      actif: true,
    });

    if (moyen.principal) {
      return this.dataSource.transaction(async (manager) => {
        await manager.update(
          MoyenPaiementClient,
          { clientId, principal: true },
          { principal: false },
        );
        return manager.save(MoyenPaiementClient, moyen);
      });
    }
    return this.repo.save(moyen);
  }

  async findMine(clientId: string): Promise<MoyenPaiementClient[]> {
    const moyens = await this.repo.find({ where: { clientId } });
    return this.trier(moyens);
  }

  async update(
    id: string,
    clientId: string,
    dto: UpdateMoyenPaiementClientDto,
  ): Promise<MoyenPaiementClient> {
    const moyen = await this.chargerSien(id, clientId);

    if (dto.type !== undefined) moyen.type = dto.type;
    if (dto.numero !== undefined) moyen.numero = dto.numero.trim();
    if (dto.nomTitulaire !== undefined) {
      moyen.nomTitulaire = dto.nomTitulaire.trim();
    }
    if (dto.operateur !== undefined || dto.type !== undefined) {
      moyen.operateur = this.operateurPour(
        moyen.type,
        dto.operateur !== undefined ? dto.operateur : (moyen.operateur ?? undefined),
      );
    }

    const principalDemande = dto.principal ?? moyen.principal;
    if (principalDemande && !moyen.principal) {
      return this.dataSource.transaction(async (manager) => {
        await manager.update(
          MoyenPaiementClient,
          { clientId, principal: true },
          { principal: false },
        );
        moyen.principal = true;
        return manager.save(MoyenPaiementClient, moyen);
      });
    }
    moyen.principal = principalDemande;
    return this.repo.save(moyen);
  }

  async setPrincipal(
    id: string,
    clientId: string,
  ): Promise<MoyenPaiementClient> {
    const moyen = await this.chargerSien(id, clientId);
    if (!moyen.actif) {
      throw new BadRequestException(
        'Impossible de définir comme principal un moyen de paiement désactivé.',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        MoyenPaiementClient,
        { clientId, principal: true },
        { principal: false },
      );
      await manager.update(
        MoyenPaiementClient,
        { id: moyen.id },
        { principal: true },
      );
    });
    moyen.principal = true;
    return moyen;
  }

  async setActif(
    id: string,
    clientId: string,
    actif: boolean,
  ): Promise<MoyenPaiementClient> {
    const moyen = await this.chargerSien(id, clientId);
    if (actif !== moyen.actif) {
      moyen.actif = actif;
      if (!actif) moyen.principal = false;
      await this.repo.save(moyen);
    }
    return moyen;
  }

  /**
   * Suppression definitive. Un moyen deja reference par une transaction
   * (FK RESTRICT, meme philosophie que cote etudiant) ne peut pas
   * disparaitre : on propose la desactivation, qui preserve
   * l'historique des paiements passes.
   */
  async remove(id: string, clientId: string): Promise<void> {
    await this.chargerSien(id, clientId);
    try {
      await this.repo.delete({ id });
    } catch (error) {
      if (this.estErreurFk(error)) {
        throw new ConflictException(
          'Ce moyen de paiement est référencé par un ou plusieurs paiements et ne peut pas être supprimé. Désactivez-le plutôt.',
        );
      }
      throw error;
    }
  }

  // ============================================================
  // UTILISATION PAR LE MODULE PAIEMENTS
  // ============================================================

  /**
   * Verifie qu'un moyen peut servir a payer : il doit exister,
   * appartenir au client qui paie et etre actif (meme garde que
   * MoyensPaiementService.trouverPourPaiement cote beneficiaire).
   */
  async trouverPourPaiement(
    id: string,
    clientId: string,
  ): Promise<MoyenPaiementClient> {
    const moyen = await this.repo.findOne({ where: { id } });
    if (!moyen) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }
    if (moyen.clientId !== clientId) {
      throw new ForbiddenException(
        "Ce moyen de paiement ne vous appartient pas",
      );
    }
    if (!moyen.actif) {
      throw new BadRequestException(
        'Ce moyen de paiement est désactivé : il ne peut pas être utilisé pour un nouveau paiement',
      );
    }
    return moyen;
  }

  private async chargerSien(
    id: string,
    clientId: string,
  ): Promise<MoyenPaiementClient> {
    const moyen = await this.repo.findOne({ where: { id } });
    if (!moyen) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }
    if (moyen.clientId !== clientId) {
      throw new ForbiddenException(
        'Vous ne pouvez gérer que vos propres moyens de paiement',
      );
    }
    return moyen;
  }

  private operateurPour(type: string, operateur?: string): string | null {
    const libelle = (operateur ?? '').trim();
    return (
      libelle ||
      OPERATEURS_PAR_DEFAUT[type as keyof typeof OPERATEURS_PAR_DEFAUT] ||
      null
    );
  }

  private trier(
    moyens: MoyenPaiementClient[],
  ): MoyenPaiementClient[] {
    return [...moyens].sort((a, b) => {
      if (a.principal !== b.principal) return a.principal ? -1 : 1;
      if (a.actif !== b.actif) return a.actif ? -1 : 1;
      return (
        new Date(b.dateCreation ?? 0).getTime() -
        new Date(a.dateCreation ?? 0).getTime()
      );
    });
  }

  private estErreurFk(error: unknown): boolean {
    const code =
      (error as { code?: string }).code ??
      (error as { driverError?: { code?: string } }).driverError?.code;
    return code === '23503';
  }
}

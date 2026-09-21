import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MoyenPaiement } from './entities/moyen-paiement.entity';
import { CreateMoyenPaiementDto } from './dto/create-moyen-paiement.dto';
import { UpdateMoyenPaiementDto } from './dto/update-moyen-paiement.dto';
import {
  OPERATEURS_PAR_DEFAUT,
  REGEX_NUMERO_MOBILE,
  TypeMoyenPaiement,
} from './enums/type-moyen-paiement.enum';

/**
 * Presentation securisee d'un moyen de paiement destinee au client :
 * seuls les champs necessaires au transfert effectif sont exposes
 * (RG-PAY-010 : jamais d'identifiant etudiant ni de metadonnees).
 */
export interface MoyenPaiementClient {
  id: string;
  type: TypeMoyenPaiement;
  operateur: string | null;
  nomBanque: string | null;
  numero: string;
  nomTitulaire: string;
  principal: boolean;
}

@Injectable()
export class MoyensPaiementService {
  constructor(
    @InjectRepository(MoyenPaiement)
    private readonly repo: Repository<MoyenPaiement>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // CRUD ETUDIANT (RG-PAY-009 : uniquement ses propres moyens)
  // ============================================================

  /**
   * RG-PAY-001 : un etudiant peut avoir plusieurs moyens de paiement.
   * Le premier moyen cree devient automatiquement principal (RG-PAY-003).
   */
  async create(
    etudiantId: string,
    dto: CreateMoyenPaiementDto,
  ): Promise<MoyenPaiement> {
    const existants = await this.repo.find({ where: { etudiantId } });
    const principalDemande = dto.principal ?? existants.length === 0;

    const moyen = this.repo.create({
      etudiantId,
      type: dto.type,
      numero: dto.numero.trim(),
      nomTitulaire: dto.nomTitulaire.trim(),
      nomBanque:
        dto.type === TypeMoyenPaiement.BANQUE
          ? (dto.nomBanque ?? '').trim() || null
          : null,
      operateur: this.operateurPour(dto.type, dto.operateur),
      principal: principalDemande,
      actif: true,
    });
    this.validerRegles(moyen);

    // RG-PAY-008 : definir un moyen comme principal desactive le flag
    // principal de tous les autres — operation atomique (l'index unique
    // partiel "uq_moyen_paiement_principal" ferme la porte aux courses
    // concurrentes).
    if (moyen.principal) {
      return this.dataSource.transaction(async (manager) => {
        await manager.update(
          MoyenPaiement,
          { etudiantId, principal: true },
          { principal: false },
        );
        return manager.save(MoyenPaiement, moyen);
      });
    }
    return this.repo.save(moyen);
  }

  async findMine(etudiantId: string): Promise<MoyenPaiement[]> {
    const moyens = await this.repo.find({ where: { etudiantId } });
    return this.trier(moyens);
  }

  async findOne(id: string, etudiantId: string): Promise<MoyenPaiement> {
    return this.chargerSien(id, etudiantId);
  }

  async update(
    id: string,
    etudiantId: string,
    dto: UpdateMoyenPaiementDto,
  ): Promise<MoyenPaiement> {
    const moyen = await this.chargerSien(id, etudiantId);

    // Etat FINAL fusionne : le type peut changer (ex. passage d'un numero
    // MVola a un compte bancaire) — les regles sont re-verifiees sur le
    // resultat fusionne, jamais sur le seul DTO.
    const type = dto.type ?? moyen.type;
    const numero = dto.numero !== undefined ? dto.numero.trim() : moyen.numero;
    const nomTitulaire =
      dto.nomTitulaire !== undefined
        ? dto.nomTitulaire.trim()
        : moyen.nomTitulaire;
    const nomBanque =
      type === TypeMoyenPaiement.BANQUE
        ? (dto.nomBanque ?? moyen.nomBanque ?? '').trim() || null
        : null;
    const operateur = this.operateurPour(
      type,
      dto.operateur !== undefined
        ? dto.operateur
        : (moyen.operateur ?? undefined),
    );

    this.validerRegles({ type, numero, nomTitulaire, nomBanque });

    moyen.type = type;
    moyen.numero = numero;
    moyen.nomTitulaire = nomTitulaire;
    moyen.nomBanque = nomBanque;
    moyen.operateur = operateur;

    const principalDemande = dto.principal ?? moyen.principal;

    if (principalDemande && !moyen.principal) {
      return this.dataSource.transaction(async (manager) => {
        await manager.update(
          MoyenPaiement,
          { etudiantId, principal: true },
          { principal: false },
        );
        moyen.principal = true;
        return manager.save(MoyenPaiement, moyen);
      });
    }

    moyen.principal = principalDemande;
    return this.repo.save(moyen);
  }

  /**
   * Suppression definitive. Un moyen reference par une transaction
   * (piece comptable, FK RESTRICT) ne peut pas disparaitre : on propose
   * la desactivation (RG-PAY-004), qui preserve l'historique.
   */
  async remove(id: string, etudiantId: string): Promise<void> {
    await this.chargerSien(id, etudiantId);
    try {
      await this.repo.delete({ id });
    } catch (error) {
      if (this.estErreurFk(error)) {
        throw new ConflictException(
          'Ce moyen de paiement est reference par un ou plusieurs paiements et ne peut pas etre supprime. Desactivez-le plutot.',
        );
      }
      throw error;
    }
  }

  /**
   * RG-PAY-003/008 : un seul moyen principal par etudiant. Refuse un
   * moyen desactive (RG-PAY-004) puis bascule atomiquement le flag.
   */
  async setPrincipal(id: string, etudiantId: string): Promise<MoyenPaiement> {
    const moyen = await this.chargerSien(id, etudiantId);
    if (!moyen.actif) {
      throw new BadRequestException(
        'Impossible de definir comme principal un moyen de paiement desactive.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        MoyenPaiement,
        { etudiantId, principal: true },
        { principal: false },
      );
      await manager.update(MoyenPaiement, { id: moyen.id }, { principal: true });
    });
    moyen.principal = true;
    return moyen;
  }

  /**
   * RG-PAY-004 : desactiver un moyen l'ineligibilise aux nouveaux
   * paiements. Si le moyen desactive etait le principal, le flag
   * principal est retire avec lui (jamais de principal desactive).
   */
  async setActif(
    id: string,
    etudiantId: string,
    actif: boolean,
  ): Promise<MoyenPaiement> {
    const moyen = await this.chargerSien(id, etudiantId);
    if (actif !== moyen.actif) {
      moyen.actif = actif;
      if (!actif) {
        moyen.principal = false;
      }
      await this.repo.save(moyen);
    }
    return moyen;
  }



  // ============================================================
  // UTILISATION PAR LE MODULE PAIEMENTS
  // ============================================================

  /**
   * Verifie qu'un moyen peut servir de destinataire pour un paiement :
   * il doit exister, appartenir a l'etudiant BENEFICIAIRE de la
   * candidature (RG-PAY-002) et etre actif (RG-PAY-004).
   */
  async trouverPourPaiement(
    id: string,
    etudiantId: string,
  ): Promise<MoyenPaiement> {
    const moyen = await this.repo.findOne({ where: { id } });
    if (!moyen) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }
    if (moyen.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        "Ce moyen de paiement n'appartient pas a l'etudiant beneficiaire",
      );
    }
    if (!moyen.actif) {
      throw new BadRequestException(
        'Ce moyen de paiement est desactive : il ne peut pas etre utilise pour un nouveau paiement',
      );
    }
    return moyen;
  }

  /**
   * Coordonnees exposables au client pour un paiement du : moyens
   * ACTIFS uniquement, presente le principal en premier, et reduits aux
   * seuls champs utiles au transfert (RG-PAY-010).
   */
  async listerPourClient(etudiantId: string): Promise<MoyenPaiementClient[]> {
    const moyens = await this.repo.find({
      where: { etudiantId, actif: true },
    });
    return this.trier(moyens).map((moyen) => this.versMoyenClient(moyen));
  }


  // ============================================================
  // INTERNES
  // ============================================================

  /** 404 si inconnu, 403 si le moyen appartient a un autre etudiant. */
  private async chargerSien(
    id: string,
    etudiantId: string,
  ): Promise<MoyenPaiement> {
    const moyen = await this.repo.findOne({ where: { id } });
    if (!moyen) {
      throw new NotFoundException('Moyen de paiement introuvable');
    }
    if (moyen.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez gerer que vos propres moyens de paiement',
      );
    }
    return moyen;
  }

  /** RG-PAY-005, RG-PAY-006, RG-PAY-007. */
  private validerRegles(moyen: {
    type: TypeMoyenPaiement;
    numero: string;
    nomTitulaire: string;
    nomBanque: string | null;
  }): void {
    const numero = (moyen.numero ?? '').trim();
    const titulaire = (moyen.nomTitulaire ?? '').trim();

    if (!titulaire) {
      throw new BadRequestException(
        'Le nom du titulaire est obligatoire (RG-PAY-007)',
      );
    }
    if (!numero) {
      throw new BadRequestException(
        'Le numero (Mobile Money ou compte bancaire) est obligatoire',
      );
    }
    if (moyen.type === TypeMoyenPaiement.BANQUE) {
      if (!(moyen.nomBanque ?? '').trim()) {
        throw new BadRequestException(
          'Le nom de la banque est obligatoire pour un compte bancaire (RG-PAY-005)',
        );
      }
    } else if (!REGEX_NUMERO_MOBILE.test(numero)) {
      throw new BadRequestException(
        'Le numero Mobile Money doit etre au format malgache : 10 chiffres commençant par 03 (ex. 0341234567)',
      );
    }
  }

  private operateurPour(
    type: TypeMoyenPaiement,
    operateur?: string,
  ): string | null {
    if (type === TypeMoyenPaiement.BANQUE) {
      return null;
    }
    const libelle = (operateur ?? '').trim();
    return libelle || OPERATEURS_PAR_DEFAUT[type] || null;
  }

  /** Principal d'abord, actifs ensuite, les plus recents en tete. */
  private trier(moyens: MoyenPaiement[]): MoyenPaiement[] {
    return [...moyens].sort((a, b) => {
      if (a.principal !== b.principal) return a.principal ? -1 : 1;
      if (a.actif !== b.actif) return a.actif ? -1 : 1;
      return (
        new Date(b.dateCreation ?? 0).getTime() -
        new Date(a.dateCreation ?? 0).getTime()
      );
    });
  }

  private versMoyenClient(moyen: MoyenPaiement): MoyenPaiementClient {
    return {
      id: moyen.id,
      type: moyen.type,
      operateur: moyen.operateur,
      nomBanque: moyen.nomBanque,
      numero: moyen.numero,
      nomTitulaire: moyen.nomTitulaire,
      principal: moyen.principal,
    };
  }

  /**
   * Code d'erreur PostgreSQL "foreign_key_violation". Suivant la voie
   * d'execution, le code se trouve sur l'erreur ou sur son driverError.
   */
  private estErreurFk(error: unknown): boolean {
    const code =
      (error as { code?: string }).code ??
      (error as { driverError?: { code?: string } }).driverError?.code;
    return code === '23503';
  }
}

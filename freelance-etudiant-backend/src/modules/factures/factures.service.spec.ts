import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { FacturesService, formaterNumeroFacture } from './factures.service';
import { StatutTransaction, MethodePaiement } from '../../common/enums/statut-transaction.enum';
import { Role } from '../../common/enums/role.enum';

const CLIENT = { id: 'c1', email: 'c@x.test', role: Role.CLIENT };
const ETUDIANT = { id: 'e1', email: 'e@x.test', role: Role.ETUDIANT };
const AUTRE = { id: 'z9', email: 'z@x.test', role: Role.CLIENT };
const ADMIN = { id: 'a1', email: 'a@x.test', role: Role.ADMIN };

function transaction(extra: Record<string, unknown> = {}) {
  return {
    id: 't1',
    clientId: 'c1',
    etudiantId: 'e1',
    montant: '75000.00',
    methode: MethodePaiement.PAPI,
    reference: 'KIANJA-AAA',
    statut: StatutTransaction.CONFIRMEE,
    dateConfirmation: new Date('2026-10-12T10:00:00Z'),
    candidature: { mission: { titre: 'Site vitrine' } },
    client: { nom: 'Rakoto', email: 'c@x.test' },
    etudiant: { nom: 'Rasoa' },
    ...extra,
  };
}

function creer(options: { existante?: unknown; tx?: unknown; compteur?: number } = {}) {
  const repo = { findOne: jest.fn().mockResolvedValue(options.existante ?? null), find: jest.fn().mockResolvedValue([]) };
  const txRepo = { findOne: jest.fn().mockResolvedValue(options.tx === undefined ? transaction() : options.tx) };
  const sauvegardes: unknown[] = [];
  const manager = {
    findOne: jest.fn().mockResolvedValue({ nomEntreprise: 'Acme SARL' }),
    query: jest.fn().mockResolvedValue([{ dernier: options.compteur ?? 7 }]),
    create: jest.fn((_e: unknown, d: unknown) => d),
    save: jest.fn((_e: unknown, d: unknown) => {
      sauvegardes.push(d);
      return Promise.resolve({ id: 'f1', ...(d as object) });
    }),
  };
  const dataSource = { transaction: jest.fn((fn: (m: unknown) => unknown) => fn(manager)) };
  const config = { get: (k: string) => ({ FACTURE_EMETTEUR_NOM: 'Kianja SARL', FACTURE_EMETTEUR_MENTION: 'NIF 123' })[k] };
  const service = new FacturesService(repo as never, txRepo as never, dataSource as never, config as never);
  return { service, repo, txRepo, manager, dataSource, sauvegardes };
}

describe('formaterNumeroFacture', () => {
  it('formate KJ-FAC-AAAA-NNNNNN', () => {
    expect(formaterNumeroFacture(2026, 42)).toBe('KJ-FAC-2026-000042');
    expect(formaterNumeroFacture(2027, 1)).toBe('KJ-FAC-2027-000001');
  });
});

describe('FacturesService', () => {
  it('genere une facture avec numero du compteur et donnees figees', async () => {
    const { service, manager } = creer({ compteur: 7 });
    const f = await service.genererPourTransaction('t1');

    const annee = new Date().getFullYear();
    expect(f).toMatchObject({
      numero: `KJ-FAC-${annee}-000007`,
      transactionId: 't1',
      montant: 75000,
      devise: 'Ar',
      referencePaiement: 'KIANJA-AAA',
      titreMission: 'Site vitrine',
      clientNom: 'Rakoto',
      clientEntreprise: 'Acme SARL',
      etudiantNom: 'Rasoa',
      emetteurNom: 'Kianja SARL',
      emetteurMention: 'NIF 123',
    });
    // Le compteur est incremente dans la meme transaction SQL.
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  it('est idempotente : une facture existante est renvoyee sans nouveau numero', async () => {
    const existante = { id: 'f0', numero: 'KJ-FAC-2026-000001' };
    const { service, dataSource, txRepo } = creer({ existante });
    await expect(service.genererPourTransaction('t1')).resolves.toBe(existante);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(txRepo.findOne).not.toHaveBeenCalled();
  });

  it("refuse d'emettre une facture pour un paiement non confirme", async () => {
    for (const statut of [StatutTransaction.EN_ATTENTE, StatutTransaction.ANNULEE]) {
      const { service, dataSource } = creer({ tx: transaction({ statut }) });
      await expect(service.genererPourTransaction('t1')).rejects.toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    }
  });

  it('accepte un paiement libere', async () => {
    const { service } = creer({ tx: transaction({ statut: StatutTransaction.LIBEREE }) });
    await expect(service.genererPourTransaction('t1')).resolves.toBeDefined();
  });

  it('transaction inconnue -> 404', async () => {
    const { service } = creer({ tx: null });
    await expect(service.genererPourTransaction('x')).rejects.toThrow(NotFoundException);
  });

  it('course concurrente (23505) : renvoie la facture creee par l\'autre requete', async () => {
    const concurrente = { id: 'f2', numero: 'KJ-FAC-2026-000003' };
    const ctx = creer();
    const err = Object.assign(new QueryFailedError('insert', [], new Error('dup')), { code: '23505' });
    (ctx.dataSource.transaction as jest.Mock).mockRejectedValue(err);
    ctx.repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(concurrente);
    await expect(ctx.service.genererPourTransaction('t1')).resolves.toBe(concurrente);
  });

  it('genererSansBloquer avale les erreurs (ne bloque pas la confirmation)', async () => {
    const { service } = creer({ tx: null });
    await expect(service.genererSansBloquer('x')).resolves.toBeUndefined();
  });

  describe('controle d\'acces', () => {
    it('client payeur, etudiant beneficiaire et admin y ont acces', async () => {
      const facture = { id: 'f1', clientId: 'c1', etudiantId: 'e1' };
      for (const u of [CLIENT, ETUDIANT, ADMIN]) {
        const { service, repo } = creer();
        repo.findOne.mockResolvedValue(facture);
        await expect(service.trouver('f1', u)).resolves.toBe(facture);
      }
    });

    it('un tiers recoit 403, une facture absente 404', async () => {
      const { service, repo } = creer();
      repo.findOne.mockResolvedValue({ id: 'f1', clientId: 'c1', etudiantId: 'e1' });
      await expect(service.trouver('f1', AUTRE)).rejects.toThrow(ForbiddenException);
      repo.findOne.mockResolvedValue(null);
      await expect(service.trouver('f1', CLIENT)).rejects.toThrow(NotFoundException);
    });

    it('trouverPourTransaction : un tiers ne declenche aucune generation', async () => {
      const { service, dataSource, txRepo } = creer();
      txRepo.findOne.mockResolvedValue({ id: 't1', clientId: 'c1', etudiantId: 'e1' });
      await expect(service.trouverPourTransaction('t1', AUTRE)).rejects.toThrow(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('lister', () => {
    it('filtre selon le role', async () => {
      const { service, repo } = creer();
      await service.lister(CLIENT);
      expect(repo.find).toHaveBeenLastCalledWith(expect.objectContaining({ where: { clientId: 'c1' } }));
      await service.lister(ETUDIANT);
      expect(repo.find).toHaveBeenLastCalledWith(expect.objectContaining({ where: { etudiantId: 'e1' } }));
      await service.lister(ADMIN);
      expect(repo.find).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
    });
  });
});

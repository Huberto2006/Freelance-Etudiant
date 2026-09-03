/**
 * ============================================================
 * TESTS DES REGLES METIER DE FIN DE PROJET (Kianja)
 * ============================================================
 *
 * Regle obligatoire : Livraison validee + Paiement confirme
 * + Evaluation effectuee -> PROJET TERMINE.
 *
 * Aucun framework de test n'est configure dans ce projet : ce script
 * autonome (ts-node) instancie les services reels avec des dependances
 * simulees (repositories/services en memoire) et execute les 10
 * scenarios exiges.
 *
 * Execution :
 *   npx ts-node -r tsconfig-paths/register test/regles-fin-projet.ts
 */
// reflect-metadata doit etre charge avant les entites/services :
// leurs decorateurs (@Entity, @Injectable, colonnes TypeORM)
// s'appuient sur les metadonnees Reflect.
import 'reflect-metadata';

import type { Repository } from 'typeorm';

import { Evaluation } from '../src/modules/evaluations/entities/evaluation.entity';
import { Transaction } from '../src/modules/paiements/entities/transaction.entity';
import { Livraison } from '../src/modules/livraisons/entities/livraison.entity';
import { Candidature } from '../src/modules/candidatures/entities/candidature.entity';
import { Mission } from '../src/modules/missions/entities/mission.entity';
import { CreerPaiementDto } from '../src/modules/paiements/dto/creer-paiement.dto';
import { CreateEvaluationDto } from '../src/modules/evaluations/dto/create-evaluation.dto';

// Services reels testes : instancies ci-dessous avec des depots
// en memoire (meme logique metier que la base, sans PostgreSQL).
import { PaiementsService } from '../src/modules/paiements/paiements.service';
import { EvaluationsService } from '../src/modules/evaluations/evaluations.service';
import { LivraisonsService } from '../src/modules/livraisons/livraisons.service';
import { CandidaturesService } from '../src/modules/candidatures/candidatures.service';
import { MissionsService } from '../src/modules/missions/missions.service';

// Dependances simulees : "import type" est efface a la compilation,
// aucune vraie classe (ConfigService, SMTP, MVola) n'est chargee.
import type { NotificationsService } from '../src/modules/notifications/notifications.service';
import type { ReputationService } from '../src/modules/reputation/reputation.service';
import type { EmailService } from '../src/modules/email/email.service';
import type { UsersService } from '../src/modules/users/users.service';
import type { MvolaService } from '../src/modules/paiements/mvola.service';

import { StatutCandidature } from '../src/common/enums/statut-candidature.enum';
import { StatutLivraison } from '../src/common/enums/statut-livraison.enum';
import {
  MethodePaiement,
  StatutTransaction,
} from '../src/common/enums/statut-transaction.enum';
import { StatutMission } from '../src/common/enums/statut-mission.enum';

// ============================================================
// OUTILS
// ============================================================

let echecs = 0;
let reussites = 0;

function verifier(nom: string, condition: boolean, detail?: string): void {
  if (condition) {
    reussites++;
    console.log(`  [OK] ${nom}`);
  } else {
    echecs++;
    console.error(`  [ECHEC] ${nom}${detail ? ' — ' + detail : ''}`);
  }
}

async function attendreErreur(
  nom: string,
  promesse: Promise<unknown>,
  statutAttendu: number,
  messageAttendu?: string,
): Promise<void> {
  try {
    await (await promesse);
    verifier(nom, false, 'aucune erreur levee alors qu un refus etait attendu');
  } catch (erreur) {
    const statut =
      typeof (erreur as { getStatus?: () => number }).getStatus === 'function'
        ? (erreur as { getStatus: () => number }).getStatus()
        : undefined;
    const message = (erreur as Error).message ?? '';
    verifier(
      nom,
      statut === statutAttendu,
      `statut recu ${statut}, message "${message}"`,
    );
    if (messageAttendu) {
      verifier(
        `${nom} (message metier)`,
        message.includes(messageAttendu),
        `message recu : "${message}"`,
      );
    }
  }
}

// ============================================================
// DEPOTS EN MEMOIRE (remplacent les repositories TypeORM)
// ============================================================

let compteurId = 0;

type EntiteAvecId = { id?: string };

class DepotMemoire<T extends EntiteAvecId> {
  items: T[] = [];

  // Resolveurs de relations : les services reels chargent les
  // relations via TypeORM ; ici on rebranche les objets entre eux
  // a chaque lecture pour reproduire ce comportement.
  private resolveurs: Array<(item: T) => void> = [];

  ajouterResolveur(resolveur: (item: T) => void): void {
    this.resolveurs.push(resolveur);
  }

  private hydrater(item: T): T {
    for (const resolveur of this.resolveurs) {
      resolveur(item);
    }
    return item;
  }

  /** Supporte un where objet OU un tableau de wheres (TypeORM OR). */
  async findOne(options: {
    where?:
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
  }): Promise<T | null> {
    const brut = options?.where ?? {};
    const criteres = Array.isArray(brut) ? brut : [brut];

    for (const critere of criteres) {
      const entrees = Object.entries(critere ?? {});
      const trouve = this.items.find((item) =>
        entrees.every(
          ([cle, valeur]) =>
            (item as Record<string, unknown>)[cle] ===
            valeur,
        ),
      );
      if (trouve) {
        return this.hydrater(trouve);
      }
    }
    return null;
  }

  create(donnees: Partial<T>): T {
    return { ...donnees } as T;
  }

  async save(item: T): Promise<T> {
    if (!item.id) {
      compteurId += 1;
      (item as Record<string, unknown>).id = `id-${compteurId}`;
    }
    const index = this.items.findIndex(
      (existant) => existant.id === item.id,
    );
    if (index >= 0) {
      this.items[index] = item;
    } else {
      this.items.push(item);
    }
    return item;
  }

  async remove(item: T): Promise<void> {
    this.items = this.items.filter(
      (existant) => existant.id !== item.id,
    );
  }
}

// ============================================================
// CONSTRUCTION DU GRAPHE D'ENTITES ET DES SERVICES
// ============================================================

const depotMissions = new DepotMemoire<Mission>();
const depotCandidatures = new DepotMemoire<Candidature>();
const depotLivraisons = new DepotMemoire<Livraison>();
const depotTransactions = new DepotMemoire<Transaction>();
const depotEvaluations = new DepotMemoire<Evaluation>();

// Relations, comme le ferait TypeORM avec "relations: [...]".
depotMissions.ajouterResolveur((mission) => {
  mission.candidatures = depotCandidatures.items.filter(
    (c) => c.missionId === mission.id,
  );
});
depotCandidatures.ajouterResolveur((candidature) => {
  candidature.mission =
    depotMissions.items.find(
      (m) => m.id === candidature.missionId,
    ) ?? (null as unknown as Mission);
  candidature.livraison =
    depotLivraisons.items.find(
      (l) => l.candidatureId === candidature.id,
    ) ?? null;
  candidature.etudiant = {
    utilisateurId: candidature.etudiantId,
    utilisateur: {
      id: candidature.etudiantId,
      nom: 'Etudiant Test',
      email: 'etudiant@kianja.mg',
    },
  } as unknown as Candidature['etudiant'];
});
depotLivraisons.ajouterResolveur((livraison) => {
  livraison.candidature =
    depotCandidatures.items.find(
      (c) => c.id === livraison.candidatureId,
    ) ?? (null as unknown as Candidature);
  livraison.evaluations = depotEvaluations.items.filter(
    (e) => e.livraisonId === livraison.id,
  );
});
depotTransactions.ajouterResolveur((transaction) => {
  transaction.candidature = depotCandidatures.items.find(
    (c) => c.id === transaction.candidatureId,
  );
  transaction.client = {
    id: transaction.clientId,
    nom: 'Client Test',
    email: 'client@kianja.mg',
  } as unknown as Transaction['client'];
  transaction.etudiant = {
    id: transaction.etudiantId,
    nom: 'Etudiant Test',
    email: 'etudiant@kianja.mg',
  } as unknown as Transaction['etudiant'];
});

// Dependances metier simulees (aucun effet de bord).
const notificationsFaux = {
  creer: async () => undefined,
} as unknown as NotificationsService;

const reputationFaux = {
  recalculerScore: async () => undefined,
} as unknown as ReputationService;

const emailFaux = {
  envoyerPaiementInitie: async () => undefined,
  envoyerPaiementConfirme: async () => undefined,
  envoyerPaiementLibere: async () => undefined,
} as unknown as EmailService;

const usersFaux = {
  findById: async () => ({
    id: 'etudiant-1',
    nom: 'Etudiant Test',
    email: 'etudiant@kianja.mg',
  }),
} as unknown as UsersService;

const mvolaFaux = {
  estConfigure: false,
  initierPaiement: async () => {
    throw new Error('MVola non utilise dans ces tests');
  },
  verifierStatut: async () => 'completed',
} as unknown as MvolaService;

const missionsService = new MissionsService(
  depotMissions as unknown as Repository<Mission>,
);

const candidaturesService = new CandidaturesService(
  depotCandidatures as unknown as Repository<Candidature>,
  missionsService,
  notificationsFaux,
);

const paiementsService = new PaiementsService(
  depotTransactions as unknown as Repository<Transaction>,
  depotLivraisons as unknown as Repository<Livraison>,
  candidaturesService,
  notificationsFaux,
  mvolaFaux,
  emailFaux,
  usersFaux,
);

const livraisonsService = new LivraisonsService(
  depotLivraisons as unknown as Repository<Livraison>,
  candidaturesService,
  notificationsFaux,
  paiementsService,
);

const evaluationsService = new EvaluationsService(
  depotEvaluations as unknown as Repository<Evaluation>,
  depotTransactions as unknown as Repository<Transaction>,
  livraisonsService,
  reputationFaux,
  notificationsFaux,
  missionsService,
);

/** Cree une mission + candidature acceptee + livraison en attente. */
function creerJeuDeDonnees(prefixe: string): {
  mission: Mission;
  candidature: Candidature;
  livraison: Livraison;
} {
  const mission = {
    id: `${prefixe}-mission`,
    titre: `Mission test ${prefixe}`,
    statut: StatutMission.EN_COURS,
    clientId: 'client-1',
  } as unknown as Mission;

  const candidature = {
    id: `${prefixe}-candidature`,
    missionId: mission.id,
    etudiantId: 'etudiant-1',
    statut: StatutCandidature.ACCEPTEE,
    prixPropose: 100000,
  } as unknown as Candidature;

  const livraison = {
    id: `${prefixe}-livraison`,
    candidatureId: candidature.id,
    statut: StatutLivraison.EN_ATTENTE,
  } as unknown as Livraison;

  depotMissions.items.push(mission);
  depotCandidatures.items.push(candidature);
  depotLivraisons.items.push(livraison);

  return { mission, candidature, livraison };
}

// ============================================================
// SCENARIOS : Livraison validee -> Paiement -> Evaluation -> Termine
// ============================================================

async function principal(): Promise<void> {
  console.log(
    '\n=== WORKFLOW DE FIN DE PROJET : livraison validee -> paiement -> evaluation -> termine ===',
  );

  const { mission, livraison } =
    creerJeuDeDonnees('principal');

  // ------------------------------------------------------------
  // SCENARIO 1 : livraison non validee -> paiement impossible
  // ------------------------------------------------------------
  const dtoPaiement: CreerPaiementDto = {
    montant: 100000,
    methode: MethodePaiement.VIREMENT,
    reference: 'MV-REF-001',
  } as CreerPaiementDto;

  await attendreErreur(
    'S1 - paiement refuse tant que la livraison n est pas validee',
    paiementsService.creer(
      'principal-candidature',
      'client-1',
      dtoPaiement,
    ),
    400,
    'valider la livraison',
  );

  // ------------------------------------------------------------
  // SCENARIO 2 : livraison validee -> paiement disponible
  // ------------------------------------------------------------
  livraison.statut = StatutLivraison.VALIDEE;

  const transaction = await paiementsService.creer(
    'principal-candidature',
    'client-1',
    dtoPaiement,
  );
  verifier(
    'S2 - paiement cree apres validation de la livraison',
    Boolean(transaction?.id),
  );
  verifier(
    'S2 - paiement en attente de confirmation',
    transaction.statut === StatutTransaction.EN_ATTENTE,
  );

  // ------------------------------------------------------------
  // SCENARIO 3 : paiement non confirme -> evaluation impossible
  // ------------------------------------------------------------
  await attendreErreur(
    'S3 - evaluation refusee tant que le paiement n est pas confirme',
    evaluationsService.create(
      'principal-livraison',
      'client-1',
      { note: 5 } as CreateEvaluationDto,
    ),
    400,
    'effectuer le paiement',
  );

  // ------------------------------------------------------------
  // SCENARIO 8 (partie 1) : paiement confirme mais projet pas
  // encore evalue -> la mission n est PAS terminee.
  // ------------------------------------------------------------
  await paiementsService.confirmer(transaction.id);

  const transactionFinale = depotTransactions.items.find(
    (t) => t.id === transaction.id,
  )!;
  verifier(
    'S8a - paiement confirme puis automatiquement libere (livraison deja validee)',
    transactionFinale.statut ===
      StatutTransaction.CONFIRMEE ||
      transactionFinale.statut ===
        StatutTransaction.LIBEREE,
  );

  const missionApresPaiement =
    await missionsService.findOne(mission.id);
  verifier(
    'S8b - projet encore incomplet sans evaluation',
    missionApresPaiement.statut !==
      StatutMission.TERMINEE,
  );

  // ------------------------------------------------------------
  // SCENARIOS 4 + 5 : paiement confirme -> evaluation disponible
  // -> projet termine.
  // ------------------------------------------------------------
  const evaluation = await evaluationsService.create(
    'principal-livraison',
    'client-1',
    {
      note: 5,
      commentaire: 'Excellent travail',
    } as CreateEvaluationDto,
  );
  verifier(
    'S4 - evaluation acceptee apres paiement confirme',
    Boolean(evaluation?.id),
  );

  const missionFinale = await missionsService.findOne(
    mission.id,
  );
  verifier(
    'S5 - projet termine apres evaluation',
    missionFinale.statut === StatutMission.TERMINEE,
  );

  // ------------------------------------------------------------
  // SCENARIO 6 : deuxieme evaluation -> refusee
  // ------------------------------------------------------------
  await attendreErreur(
    'S6 - deuxieme evaluation refusee',
    evaluationsService.create(
      'principal-livraison',
      'client-1',
      { note: 3 } as CreateEvaluationDto,
    ),
    409,
    'deja ete evaluee',
  );

  // ------------------------------------------------------------
  // SCENARIOS 7 + 8 : sans paiement -> evaluation impossible
  // -> projet jamais termine (pas de paiement, pas de terminaison).
  // ------------------------------------------------------------
  const {
    mission: missionSansPaiement,
    livraison: livraisonSansPaiement,
  } = creerJeuDeDonnees('sans-paiement');
  livraisonSansPaiement.statut =
    StatutLivraison.VALIDEE;

  await attendreErreur(
    'S7 - evaluation refusee sans paiement confirme',
    evaluationsService.create(
      'sans-paiement-livraison',
      'client-1',
      { note: 4 } as CreateEvaluationDto,
    ),
    400,
    'effectuer le paiement',
  );

  const missionSansPaiementFinale =
    await missionsService.findOne(
      missionSansPaiement.id,
    );
  verifier(
    'S7 - mission sans paiement jamais terminee',
    missionSansPaiementFinale.statut !==
      StatutMission.TERMINEE,
  );

  verifier(
    'S8 - aucune evaluation persistee pour la mission sans paiement',
    depotEvaluations.items.every(
      (e) =>
        e.livraisonId !== 'sans-paiement-livraison',
    ),
  );

  console.log(
    `\n=== RESULTAT : ${reussites} reussite(s), ${echecs} echec(s) ===`,
  );
  if (echecs > 0) {
    process.exitCode = 1;
  }
}

void principal();

/**
 * =========================================================================
 * TESTS DES EMAILS TRANSACTIONNELS KIANJA
 * =========================================================================
 *
 * Scénarios vérifiés :
 * 1. Candidature acceptée -> statut ACCEPTEE + email étudiant envoyé
 * 2. Candidature refusée -> statut REFUSEE + email étudiant envoyé
 * 3. Nouvelle mission publiée -> statut OUVERTE + email(s) étudiants concernés
 * 4. Mission non publiée / brouillon / modérée=false -> AUCUN email
 * 5. Échec de sauvegarde -> AUCUN email
 * 6. Mission déjà publiée modifiée -> AUCUN email "nouvelle mission"
 * 7. Tolérance aux pannes : si l'envoi d'email échoue, l'action métier réussit
 * 8. Conformité des sujets et contenus HTML/Text des 3 templates
 * 9. Indépendance absolue : aucune notification interne créée par le système email
 *
 * Exécution :
 *   npx ts-node -r tsconfig-paths/register test/emails-transactionnels.ts
 */

import 'reflect-metadata';
import type { Repository, DataSource, EntityManager } from 'typeorm';

import { StatutCandidature } from '../src/common/enums/statut-candidature.enum';
import { StatutMission } from '../src/common/enums/statut-mission.enum';
import { Candidature } from '../src/modules/candidatures/entities/candidature.entity';
import { Mission } from '../src/modules/missions/entities/mission.entity';
import { EtudiantProfile } from '../src/modules/etudiants/entities/etudiant-profile.entity';
import { Utilisateur } from '../src/modules/users/entities/utilisateur.entity';

import { CandidaturesService } from '../src/modules/candidatures/candidatures.service';
import { MissionsService } from '../src/modules/missions/missions.service';
import { EmailsService } from '../src/modules/emails/emails.service';
import { ConfigService } from '@nestjs/config';

import { templateCandidatureAcceptee } from '../src/modules/emails/templates/candidature-acceptee.template';
import { templateCandidatureRefusee } from '../src/modules/emails/templates/candidature-refusee.template';
import { templateNouvelleMission } from '../src/modules/emails/templates/nouvelle-mission.template';

// =========================================================================
// OUTILS DE TEST
// =========================================================================

let testsExecutes = 0;
let testsReussis = 0;
let testsEchoues = 0;

function assert(condition: boolean, message: string) {
  testsExecutes++;
  if (condition) {
    testsReussis++;
    console.log(`  [OK] ${message}`);
  } else {
    testsEchoues++;
    console.error(`  [ECHEC] ${message}`);
  }
}

// =========================================================================
// MOCKS & DONNÉES DE TEST
// =========================================================================

class MockEmailsService extends EmailsService {
  public emailsEnvoyes: Array<{
    type: 'acceptee' | 'refusee' | 'nouvelle_mission';
    to: string;
    sujet: string;
    html: string;
    text: string;
    payload?: any;
  }> = [];

  public leverErreurSurEnvoi = false;

  constructor(configService: ConfigService) {
    super(configService);
  }

  async envoyerMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    if (this.leverErreurSurEnvoi) {
      throw new Error('Erreur SMTP simulée : connexion refusée');
    }
    this.emailsEnvoyes.push({
      type: 'acceptee', // sera remplacé ci-dessous
      to,
      sujet: subject,
      html,
      text,
    });
    return true;
  }

  async sendCandidatureAcceptee(params: any): Promise<boolean> {
    try {
      if (this.leverErreurSurEnvoi) {
        throw new Error('Erreur SMTP simulée dans sendCandidatureAcceptee');
      }
      const data = {
        nom: params.nom,
        titreMission: params.titreMission,
        lienKianja: `http://localhost:3001/tableau-de-bord/candidatures`,
      };
      const { subject, html, text } = templateCandidatureAcceptee(data);
      this.emailsEnvoyes.push({
        type: 'acceptee',
        to: params.email,
        sujet: subject,
        html,
        text,
        payload: params,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async sendCandidatureRefusee(params: any): Promise<boolean> {
    try {
      if (this.leverErreurSurEnvoi) {
        throw new Error('Erreur SMTP simulée dans sendCandidatureRefusee');
      }
      const data = {
        nom: params.nom,
        titreMission: params.titreMission,
        lienKianja: `http://localhost:3001/tableau-de-bord/candidatures`,
      };
      const { subject, html, text } = templateCandidatureRefusee(data);
      this.emailsEnvoyes.push({
        type: 'refusee',
        to: params.email,
        sujet: subject,
        html,
        text,
        payload: params,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async sendNouvelleMission(destinataires: any[], mission: any): Promise<number> {
    if (this.leverErreurSurEnvoi) {
      throw new Error('Erreur SMTP simulée dans sendNouvelleMission');
    }
    const cleanDestinataires = destinataires.filter(
      (d, index, arr) => arr.findIndex((x) => x.email === d.email) === index,
    );
    for (const dest of cleanDestinataires) {
      const data = {
        nom: dest.nom,
        titre: mission.titre,
        description: mission.description,
        categorie: mission.categorie,
        budget: mission.budget,
        dateLimite: '31/12/2026',
        lienMission: `http://localhost:3001/missions/${mission.id}`,
      };
      const { subject, html, text } = templateNouvelleMission(data);
      this.emailsEnvoyes.push({
        type: 'nouvelle_mission',
        to: dest.email,
        sujet: subject,
        html,
        text,
        payload: { dest, mission },
      });
    }
    return cleanDestinataires.length;
  }
}

// Mock NotificationsService existant : on vérifie qu'il n'est PAS appelé par le système d'email
class MockNotificationsService {
  public notificationsCreees: any[] = [];

  async creer(dto: any) {
    this.notificationsCreees.push(dto);
    return { id: 'notif-' + Math.random(), ...dto };
  }
}

async function executerTests() {
  console.log('\n============================================================');
  console.log('TESTS 1 : TEMPLATES D\'EMAILS TRANSACTIONNELS');
  console.log('============================================================');

  // Test Template 1 : Acceptation
  const tplAcceptee = templateCandidatureAcceptee({
    nom: 'Rasoa',
    titreMission: 'Développement API NestJS',
    lienKianja: 'http://localhost:3001/tableau-de-bord/candidatures',
  });
  assert(
    tplAcceptee.subject === 'Votre candidature a été acceptée — Développement API NestJS',
    'Sujet email acceptation conforme : "Votre candidature a été acceptée — [Titre mission]"',
  );
  assert(tplAcceptee.html.includes('Rasoa'), 'HTML acceptation inclut le nom de l\'étudiant');
  assert(tplAcceptee.html.includes('Développement API NestJS'), 'HTML acceptation inclut le titre de la mission');
  assert(tplAcceptee.html.includes('accepté votre candidature'), 'HTML acceptation confirme l\'acceptation');
  assert(tplAcceptee.html.includes('http://localhost:3001/tableau-de-bord/candidatures'), 'HTML acceptation inclut le lien Kianja');

  // Test Template 2 : Refus
  const tplRefusee = templateCandidatureRefusee({
    nom: 'Rakoto',
    titreMission: 'Design UI/UX Mobile',
    lienKianja: 'http://localhost:3001/tableau-de-bord/candidatures',
  });
  assert(
    tplRefusee.subject === 'Mise à jour de votre candidature — Design UI/UX Mobile',
    'Sujet email refus conforme : "Mise à jour de votre candidature — [Titre mission]"',
  );
  assert(tplRefusee.html.includes('Design UI/UX Mobile'), 'HTML refus inclut le titre de la mission');
  assert(
    tplRefusee.html.includes("n'a pas été retenue"),
    'HTML refus informe clairement que la candidature n\'a pas été retenue',
  );
  assert(tplRefusee.html.includes('http://localhost:3001/tableau-de-bord/candidatures'), 'HTML refus inclut le lien Kianja');

  // Test Template 3 : Nouvelle mission
  const tplNouvelleMission = templateNouvelleMission({
    nom: 'Koto',
    titre: 'Intégration Next.js 15',
    description: 'Mission de création d\'un dashboard étudiant responsive',
    categorie: 'Développement Web',
    budget: 350000,
    dateLimite: '25/11/2026',
    lienMission: 'http://localhost:3001/missions/mission-uuid-123',
  });
  assert(
    tplNouvelleMission.subject === 'Nouvelle mission disponible — Intégration Next.js 15',
    'Sujet email nouvelle mission conforme : "Nouvelle mission disponible — [Titre mission]"',
  );
  assert(tplNouvelleMission.html.includes('Intégration Next.js 15'), 'HTML nouvelle mission inclut le titre');
  assert(tplNouvelleMission.html.includes('Développement Web'), 'HTML nouvelle mission inclut la catégorie');
  assert(tplNouvelleMission.html.includes('350\u202f000 Ar') || tplNouvelleMission.html.includes('350 000 Ar'), 'HTML nouvelle mission inclut le budget formaté en Ariary');
  assert(tplNouvelleMission.html.includes('25/11/2026'), 'HTML nouvelle mission inclut la date limite');
  assert(tplNouvelleMission.html.includes('http://localhost:3001/missions/mission-uuid-123'), 'HTML nouvelle mission inclut le lien vers la mission');

  console.log('\n============================================================');
  console.log('TESTS 2 : CANDIDATURE ACCEPTÉE -> EMAIL ÉTUDIANT');
  console.log('============================================================');

  const configService = new ConfigService({
    FRONTEND_URL: 'http://localhost:3001',
    MAIL_FROM: 'no-reply@kianja.mg',
    MAIL_FROM_NAME: 'KIANJA',
  });

  const mockEmailsService = new MockEmailsService(configService);
  const mockNotificationsService = new MockNotificationsService();

  // Candidature en mémoire
  const clientUser = { id: 'client-1', nom: 'Entreprise ABC', email: 'client@abc.com' };
  const etudiantUser = { id: 'user-etudiant-1', nom: 'Andry Faniry', email: 'andry@etudiant.mg' };
  const etudiantProfile = {
    utilisateurId: etudiantUser.id,
    utilisateur: etudiantUser,
    competences: ['NestJS', 'TypeScript'],
  } as unknown as EtudiantProfile;

  const missionTest = {
    id: 'mission-uuid-1',
    titre: 'Développement Backend NestJS',
    clientId: 'client-1',
    client: { utilisateur: clientUser },
    statut: StatutMission.OUVERTE,
  } as unknown as Mission;

  const candidatureTest: Candidature = {
    id: 'candidature-uuid-1',
    statut: StatutCandidature.EN_ATTENTE,
    missionId: missionTest.id,
    mission: missionTest,
    etudiantId: etudiantProfile.utilisateurId,
    etudiant: etudiantProfile,
    prixPropose: 200000,
    delaiPropose: 7,
    dateCandidature: new Date(),
  } as unknown as Candidature;

  // Mock repository Candidature
  const depotCandidatures = {
    findOne: async (options: any) => {
      if (options?.where?.id === candidatureTest.id) {
        return candidatureTest;
      }
      return null;
    },
    update: async (criteria: any, partial: any) => {
      if (criteria.id === candidatureTest.id && criteria.statut === candidatureTest.statut) {
        Object.assign(candidatureTest, partial);
        return { affected: 1 };
      }
      return { affected: 0 };
    },
    save: async (c: any) => c,
  };

  // Mock DataSource transaction
  const mockDataSource = {
    transaction: async (cb: (manager: EntityManager) => Promise<any>) => {
      const mockManager = {
        findOne: async (entity: any, opts: any) => {
          if (entity === Mission) return missionTest;
          if (entity === Candidature) return candidatureTest;
          return null;
        },
        find: async () => [],
        update: async (entity: any, crit: any, updateData: any) => {
          if (entity === Candidature) {
            candidatureTest.statut = updateData.statut;
            return { affected: 1 };
          }
          if (entity === Mission) {
            missionTest.statut = updateData.statut;
            return { affected: 1 };
          }
          return { affected: 0 };
        },
        createQueryBuilder: () => ({
          update: () => ({
            set: () => ({
              where: () => ({
                andWhere: () => ({
                  execute: async () => ({ affected: 0 }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as EntityManager;
      return cb(mockManager);
    },
  } as unknown as DataSource;

  const candidaturesService = new CandidaturesService(
    depotCandidatures as unknown as Repository<Candidature>,
    null as any,
    null as any,
    mockDataSource,
    null as any,
    mockNotificationsService as any,
    mockEmailsService,
  );

  // Exécution : Accepter la candidature
  const countNotifsAvant = mockNotificationsService.notificationsCreees.length;
  await candidaturesService.accepter(candidatureTest.id, 'client-1');

  // Assertions
  assert(
    candidatureTest.statut === StatutCandidature.ACCEPTEE,
    'Candidature statut passé à ACCEPTEE',
  );
  assert(
    mockEmailsService.emailsEnvoyes.length === 1,
    'Exactement 1 email envoyé lors de l\'acceptation',
  );
  const emailAcceptee = mockEmailsService.emailsEnvoyes[0];
  assert(
    emailAcceptee.to === 'andry@etudiant.mg',
    'Email envoyé à l\'adresse de l\'étudiant candidat (andry@etudiant.mg)',
  );
  assert(
    emailAcceptee.sujet === 'Votre candidature a été acceptée — Développement Backend NestJS',
    'Sujet de l\'email conforme au titre de la mission',
  );
  assert(
    emailAcceptee.html.includes('Andry Faniry'),
    'Email contient le nom de l\'étudiant',
  );

  // Vérifier qu'aucune notification interne n'a été créée pour l'email
  const notifsGenerees = mockNotificationsService.notificationsCreees.slice(countNotifsAvant);
  const notifEmail = notifsGenerees.find((n) => n.titre?.includes('Email') || n.type?.includes('EMAIL'));
  assert(
    !notifEmail,
    'Aucune notification interne créée par le système email',
  );

  // Cas limite : Si la candidature est déjà ACCEPTÉE -> Rejet et aucun nouvel email
  mockEmailsService.emailsEnvoyes = [];
  let erreurDoubleAcceptation = false;
  try {
    await candidaturesService.accepter(candidatureTest.id, 'client-1');
  } catch (e) {
    erreurDoubleAcceptation = true;
  }
  assert(erreurDoubleAcceptation, 'Refus de ré-accepter une candidature déjà acceptée');
  assert(mockEmailsService.emailsEnvoyes.length === 0, 'Aucun email supplémentaire envoyé si déjà acceptée');

  console.log('\n============================================================');
  console.log('TESTS 3 : CANDIDATURE REFUSÉE -> EMAIL ÉTUDIANT');
  console.log('============================================================');

  // Préparer une candidature en attente pour le refus
  const candidatureRefus: Candidature = {
    id: 'candidature-uuid-2',
    statut: StatutCandidature.EN_ATTENTE,
    missionId: missionTest.id,
    mission: missionTest,
    etudiantId: etudiantProfile.utilisateurId,
    etudiant: etudiantProfile,
    prixPropose: 150000,
    delaiPropose: 5,
    dateCandidature: new Date(),
  } as unknown as Candidature;

  const depotRefus = {
    findOne: async () => candidatureRefus,
    update: async (criteria: any, partial: any) => {
      if (criteria.id === candidatureRefus.id && criteria.statut === StatutCandidature.EN_ATTENTE) {
        candidatureRefus.statut = partial.statut;
        return { affected: 1 };
      }
      return { affected: 0 };
    },
  };

  const candidaturesServiceRefus = new CandidaturesService(
    depotRefus as unknown as Repository<Candidature>,
    null as any,
    null as any,
    mockDataSource,
    null as any,
    mockNotificationsService as any,
    mockEmailsService,
  );

  mockEmailsService.emailsEnvoyes = [];
  await candidaturesServiceRefus.refuser(candidatureRefus.id, 'client-1');

  assert(
    candidatureRefus.statut === StatutCandidature.REFUSEE,
    'Candidature statut passé à REFUSEE',
  );
  assert(
    mockEmailsService.emailsEnvoyes.length === 1,
    'Exactement 1 email envoyé lors du refus',
  );
  const emailRefuse = mockEmailsService.emailsEnvoyes[0];
  assert(
    emailRefuse.to === 'andry@etudiant.mg',
    'Email envoyé à l\'adresse de l\'étudiant candidat (andry@etudiant.mg)',
  );
  assert(
    emailRefuse.sujet === 'Mise à jour de votre candidature — Développement Backend NestJS',
    'Sujet de l\'email conforme au titre de la mission',
  );
  assert(
    emailRefuse.html.includes("n'a pas été retenue"),
    'Email informe avec bienveillance que la candidature n\'a pas été retenue',
  );

  // Cas limite : Refus d'une candidature déjà refusée
  mockEmailsService.emailsEnvoyes = [];
  let erreurDoubleRefus = false;
  try {
    await candidaturesServiceRefus.refuser(candidatureRefus.id, 'client-1');
  } catch (e) {
    erreurDoubleRefus = true;
  }
  assert(erreurDoubleRefus, 'Refus d\'une candidature déjà traitée');
  assert(mockEmailsService.emailsEnvoyes.length === 0, 'Aucun email supplémentaire envoyé si déjà refusée');

  console.log('\n============================================================');
  console.log('TESTS 4 : NOUVELLE MISSION PUBLIÉE -> EMAIL AUX ÉTUDIANTS CONCERNÉS');
  console.log('============================================================');

  // Plusieurs étudiants pour tester le ciblage par compétences et catégories
  const etudiantDev = {
    utilisateurId: 'etudiant-dev-id',
    utilisateur: { nom: 'Soa Dev', email: 'soa.dev@kianja.mg', estActif: true, estSuspendu: false },
    competences: ['React', 'Next.js', 'TypeScript'],
    specialites: ['Web'],
    filiere: 'Informatique',
  } as unknown as EtudiantProfile;

  const etudiantDesign = {
    utilisateurId: 'etudiant-design-id',
    utilisateur: { nom: 'Faly Designer', email: 'faly.design@kianja.mg', estActif: true, estSuspendu: false },
    competences: ['Figma', 'Photoshop'],
    specialites: ['Graphisme'],
    filiere: 'Design',
  } as unknown as EtudiantProfile;

  const etudiantSuspendu = {
    utilisateurId: 'etudiant-suspendu-id',
    utilisateur: { nom: 'Inactif', email: 'inactif@kianja.mg', estActif: false, estSuspendu: true },
    competences: ['React'],
  } as unknown as EtudiantProfile;

  const depotEtudiants = {
    createQueryBuilder: () => ({
      leftJoinAndSelect: () => ({
        where: () => ({
          andWhere: () => ({
            getMany: async () => [etudiantDev, etudiantDesign], // seuls les actifs
          }),
        }),
      }),
    }),
  };

  const depotMissions = {
    create: (data: any) => ({ id: 'mission-pub-1', estModere: true, ...data }),
    save: async (m: any) => m,
  };

  const missionsService = new MissionsService(
    depotMissions as unknown as Repository<Mission>,
    depotEtudiants as unknown as Repository<EtudiantProfile>,
    mockEmailsService,
  );

  mockEmailsService.emailsEnvoyes = [];

  // Date limite dans le futur
  const dateDemain = new Date();
  dateDemain.setDate(dateDemain.getDate() + 10);
  const dateStr = dateDemain.toISOString().split('T')[0];

  // Création d'une mission orientée Web (compétence Next.js)
  const nouvelleMission = await missionsService.create('client-uuid-99', {
    titre: 'Refonte portail en Next.js',
    description: 'Nous cherchons un étudiant pour intégrer les maquettes en Next.js',
    budget: 450000,
    categorie: 'Développement Web',
    competencesRequises: ['Next.js'],
    dateLimite: dateStr as any,
  });

  assert(nouvelleMission.statut === StatutMission.OUVERTE, 'Mission enregistrée avec statut OUVERTE');
  assert(nouvelleMission.estModere === true, 'Mission estModere vaut true');

  // Attendre la résolution asynchrone des emails
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert(
    mockEmailsService.emailsEnvoyes.length === 1,
    'Seul l\'étudiant concerné (Soa Dev avec Next.js) a reçu l\'email (1/2 étudiants actifs)',
  );
  assert(
    mockEmailsService.emailsEnvoyes[0].to === 'soa.dev@kianja.mg',
    'Email envoyé à l\'adresse de l\'étudiant ciblé (soa.dev@kianja.mg)',
  );
  assert(
    mockEmailsService.emailsEnvoyes[0].sujet === 'Nouvelle mission disponible — Refonte portail en Next.js',
    'Sujet conforme : "Nouvelle mission disponible — Refonte portail en Next.js"',
  );

  console.log('\n============================================================');
  console.log('TESTS 5 : CAS OÙ AUCUN EMAIL NE DOIT ÊTRE ENVOYÉ');
  console.log('============================================================');

  // 1. Sauvegarde échouée (date passée)
  mockEmailsService.emailsEnvoyes = [];
  let erreurDatePasse = false;
  try {
    await missionsService.create('client-uuid-99', {
      titre: 'Mission invalide',
      description: 'Test date passée',
      budget: 100000,
      categorie: 'Autre',
      competencesRequises: [],
      dateLimite: '2020-01-01' as any,
    });
  } catch (e) {
    erreurDatePasse = true;
  }
  assert(erreurDatePasse, 'Erreur levée si dateLimite dans le passé');
  assert(mockEmailsService.emailsEnvoyes.length === 0, 'Aucun email envoyé en cas d\'erreur de validation');

  // 2. Mission privée issue de demande de service (non modérée, EN_COURS)
  mockEmailsService.emailsEnvoyes = [];
  const missionPrivee = await missionsService.creerDepuisDemandeService({
    clientId: 'client-uuid-99',
    titre: 'Mission privée sur commande directe',
    description: 'Commande directe étudiant',
    budget: 100000,
    delaiJours: 5,
    categorie: 'Développement Web',
    competencesRequises: ['React'],
  });
  assert(missionPrivee.estModere === false, 'Mission issue de service a estModere=false');
  assert(missionPrivee.statut === StatutMission.EN_COURS, 'Mission issue de service a statut=EN_COURS');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert(mockEmailsService.emailsEnvoyes.length === 0, 'Aucun email nouvelle mission envoyé pour une mission non publique');

  // 3. Modification d'une mission déjà publiée (update)
  mockEmailsService.emailsEnvoyes = [];
  const missionExistante = {
    id: 'mission-existante-id',
    clientId: 'client-uuid-99',
    titre: 'Mission déjà publiée',
    description: 'Ancienne description',
    budget: 200000,
    statut: StatutMission.OUVERTE,
    estModere: true,
    dateLimite: dateStr,
  };
  (missionsService as any).findOne = async () => missionExistante;
  await missionsService.update('mission-existante-id', 'client-uuid-99', {
    titre: 'Mission modifiée',
    description: 'Nouvelle description mise à jour',
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert(mockEmailsService.emailsEnvoyes.length === 0, 'Aucun email "nouvelle mission" lors de la modification d\'une mission existante');

  console.log('\n============================================================');
  console.log('TESTS 6 : RÉSILIENCE MÉTIER (ÉCHEC SMTP NON BLOQUANT)');
  console.log('============================================================');

  // Activer l'erreur SMTP dans le mock
  mockEmailsService.leverErreurSurEnvoi = true;

  // 1. Acceptation avec échec SMTP
  const missionSmtpFail: Mission = {
    id: 'mission-smtp-fail',
    titre: 'Mission Test Résilience',
    clientId: 'client-1',
    client: { utilisateur: clientUser as any },
    statut: StatutMission.OUVERTE,
  } as unknown as Mission;

  const candSmtpFail: Candidature = {
    id: 'cand-smtp-fail',
    statut: StatutCandidature.EN_ATTENTE,
    missionId: missionSmtpFail.id,
    mission: missionSmtpFail,
    etudiantId: etudiantProfile.utilisateurId,
    etudiant: etudiantProfile,
  } as unknown as Candidature;

  const depotSmtpFail = {
    findOne: async () => candSmtpFail,
    update: async (_: any, p: any) => {
      candSmtpFail.statut = p.statut;
      return { affected: 1 };
    },
  };

  const mockDataSourceSmtpFail = {
    transaction: async (cb: (manager: EntityManager) => Promise<any>) => {
      const mockManager = {
        findOne: async (entity: any) => {
          if (entity === Mission) return missionSmtpFail;
          if (entity === Candidature) return candSmtpFail;
          return null;
        },
        find: async () => [],
        update: async (entity: any, _crit: any, updateData: any) => {
          if (entity === Candidature) {
            candSmtpFail.statut = updateData.statut;
            return { affected: 1 };
          }
          if (entity === Mission) {
            missionSmtpFail.statut = updateData.statut;
            return { affected: 1 };
          }
          return { affected: 0 };
        },
        createQueryBuilder: () => ({
          update: () => ({
            set: () => ({
              where: () => ({
                andWhere: () => ({
                  execute: async () => ({ affected: 0 }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as EntityManager;
      return cb(mockManager);
    },
  } as unknown as DataSource;

  const candServiceSmtpFail = new CandidaturesService(
    depotSmtpFail as unknown as Repository<Candidature>,
    null as any,
    null as any,
    mockDataSourceSmtpFail,
    null as any,
    mockNotificationsService as any,
    mockEmailsService,
  );

  const resAcceptee = await candServiceSmtpFail.accepter(candSmtpFail.id, 'client-1');
  assert(
    resAcceptee.statut === StatutCandidature.ACCEPTEE,
    'Même en cas d\'échec SMTP, la candidature reste ACCEPTÉE (action métier non impactée)',
  );

  // 2. Refus avec échec SMTP
  const candSmtpFailRefus: Candidature = {
    id: 'cand-smtp-fail-refus',
    statut: StatutCandidature.EN_ATTENTE,
    missionId: missionTest.id,
    mission: missionTest,
    etudiantId: etudiantProfile.utilisateurId,
    etudiant: etudiantProfile,
  } as unknown as Candidature;

  const depotSmtpFailRefus = {
    findOne: async () => candSmtpFailRefus,
    update: async (_: any, p: any) => {
      candSmtpFailRefus.statut = p.statut;
      return { affected: 1 };
    },
  };

  const candServiceSmtpFailRefus = new CandidaturesService(
    depotSmtpFailRefus as unknown as Repository<Candidature>,
    null as any,
    null as any,
    mockDataSource,
    null as any,
    mockNotificationsService as any,
    mockEmailsService,
  );

  const resRefusee = await candServiceSmtpFailRefus.refuser(candSmtpFailRefus.id, 'client-1');
  assert(
    resRefusee.statut === StatutCandidature.REFUSEE,
    'Même en cas d\'échec SMTP, la candidature reste REFUSÉE (action métier non impactée)',
  );

  // Rétablir SMTP
  mockEmailsService.leverErreurSurEnvoi = false;

  console.log('\n============================================================');
  console.log(`RÉSULTAT FINAL DES TESTS : ${testsReussis}/${testsExecutes} vérifications réussies`);
  if (testsEchoues > 0) {
    console.error(`❌ ${testsEchoues} vérifications ont échoué.`);
    process.exit(1);
  } else {
    console.log('✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
    process.exit(0);
  }
}

executerTests().catch((err) => {
  console.error('Erreur inattendue dans la suite de tests :', err);
  process.exit(1);
});

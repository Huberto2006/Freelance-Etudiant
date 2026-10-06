/**
 * Tests des emails destinés au client après les trois événements métier.
 * Exécuter avec : npx ts-node -r tsconfig-paths/register test/emails-clients.ts
 */
import 'reflect-metadata';
import type { ConfigService } from '@nestjs/config';
import type { DataSource, Repository } from 'typeorm';
import { StatutCandidature } from '../src/common/enums/statut-candidature.enum';
import { StatutDemandeService } from '../src/common/enums/statut-demande-service.enum';
import { StatutLivraison } from '../src/common/enums/statut-livraison.enum';
import { Candidature } from '../src/modules/candidatures/entities/candidature.entity';
import { CandidaturesService } from '../src/modules/candidatures/candidatures.service';
import { CreateCandidatureDto } from '../src/modules/candidatures/dto/create-candidature.dto';
import { DemandeService } from '../src/modules/demandes-service/entities/demande-service.entity';
import { DemandesServiceService } from '../src/modules/demandes-service/demandes-service.service';
import { EmailsService } from '../src/modules/emails/emails.service';
import { Livraison } from '../src/modules/livraisons/entities/livraison.entity';
import { LivraisonsService } from '../src/modules/livraisons/livraisons.service';
import { Mission } from '../src/modules/missions/entities/mission.entity';
import { MissionsService } from '../src/modules/missions/missions.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { CreerLivraisonDto } from '../src/modules/livraisons/dto/livraison.dto';

const BASE_URL = 'https://kianja.example';

class EmailsCaptures extends EmailsService {
  readonly envoyes: Array<{
    to: string;
    sujet: string;
    html: string;
    text: string;
  }> = [];
  echec = false;

  constructor() {
    super({
      get: (key: string) =>
        key === 'FRONTEND_URL' ? BASE_URL : undefined,
    } as ConfigService);
  }

  async envoyerMail(
    to: string,
    sujet: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    this.envoyes.push({ to, sujet, html, text });
    if (this.echec) {
      throw new Error('Erreur SMTP simulée');
    }
    return true;
  }
}

function verifier(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ÉCHEC : ${message}`);
  }
  console.log(`[OK] ${message}`);
}

async function attendreEnvois(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function executerTests(): Promise<void> {
  const notifications: any[] = [];
  const notificationsFaux = {
    creer: async (dto: unknown) => notifications.push(dto),
  } as unknown as NotificationsService;
  const emails = new EmailsCaptures();

  const etudiant = {
    utilisateurId: 'etudiant-b',
    utilisateur: { id: 'etudiant-b', nom: 'Étudiant B', email: 'etudiant@example.test' },
  };
  const utilisateurClient = {
    id: 'client-a',
    nom: 'Client A',
    email: 'client-a@example.test',
  };
  const mission = {
    id: 'mission-x',
    titre: 'Mission X',
    clientId: 'client-a',
    client: { utilisateur: utilisateurClient },
  } as Mission;
  const candidature = {
    id: 'candidature-x',
    missionId: mission.id,
    etudiantId: etudiant.utilisateurId,
    statut: StatutCandidature.EN_ATTENTE,
    dateCandidature: new Date('2026-10-06T10:00:00Z'),
    mission,
    etudiant,
  } as unknown as Candidature;

  let candidatureLookup = 0;
  const candidaturesRepo = {
    create: (data: Partial<Candidature>) => ({ ...candidature, ...data }),
    save: async () => candidature,
    findOne: async () => {
      candidatureLookup++;
      return candidatureLookup === 1
        ? null
        : (candidature as Candidature);
    },
  } as unknown as Repository<Candidature>;
  const missionsService = {
    findOne: async () => mission,
    assertMissionOuverteAuxCandidatures: () => undefined,
  } as unknown as MissionsService;
  const candidaturesService = new CandidaturesService(
    candidaturesRepo,
    {} as Repository<any>,
    {} as Repository<any>,
    {} as DataSource,
    missionsService,
    notificationsFaux,
    emails,
  );

  await candidaturesService.create(
    mission.id,
    etudiant.utilisateurId,
    {} as CreateCandidatureDto,
  );
  await attendreEnvois();
  verifier(emails.envoyes.length === 1, 'une nouvelle candidature déclenche un email');
  verifier(emails.envoyes[0].to === utilisateurClient.email, 'la candidature est envoyée uniquement au client propriétaire');
  verifier(emails.envoyes[0].text.includes(mission.titre), 'le courriel de candidature contient le titre de mission');
  verifier(emails.envoyes[0].text.includes('Étudiant B'), 'le courriel de candidature identifie l’étudiant');
  verifier(emails.envoyes[0].text.includes('6 octobre 2026'), 'le courriel de candidature contient la date');
  verifier(emails.envoyes[0].sujet === 'Kianja — Nouvelle candidature pour votre mission', 'le sujet de candidature est conforme');
  verifier(notifications.length === 1, 'la notification in-app de candidature est toujours créée');
  let candidatureDupliqueeRefusee = false;
  try {
    await candidaturesService.create(
      mission.id,
      etudiant.utilisateurId,
      {} as CreateCandidatureDto,
    );
  } catch {
    candidatureDupliqueeRefusee = true;
  }
  verifier(candidatureDupliqueeRefusee, 'une candidature répétée est refusée');
  verifier(emails.envoyes.length === 1, 'une candidature répétée ne renvoie pas de doublon email');

  const livraisonRepository = (() => {
    let existante: Livraison | null = null;
    return {
      repository: {
        findOne: async () => existante,
        create: (data: Partial<Livraison>) => ({ ...data }),
        save: async (value: Partial<Livraison>) => {
          const saved = {
            ...value,
            id: 'livraison-x',
            dateLivraison: new Date('2026-10-06T11:00:00Z'),
          } as Livraison;
          existante = saved;
          return saved;
        },
      } as unknown as Repository<Livraison>,
      setExistante: (value: Livraison) => {
        existante = value;
      },
    };
  })();
  const candidaturesServiceLivraison = {
    findOne: async () => candidature,
    assertCandidatureAcceptee: () => undefined,
  } as unknown as CandidaturesService;
  const livraisonsService = new LivraisonsService(
    livraisonRepository.repository,
    candidaturesServiceLivraison,
    notificationsFaux,
    {} as any,
    emails,
  );

  await livraisonsService.creer(
    candidature.id,
    candidature.etudiantId,
    {} as CreerLivraisonDto,
  );
  await attendreEnvois();
  verifier(emails.envoyes.length === 2, 'la première livraison déclenche un email');
  verifier(emails.envoyes[1].sujet === 'Kianja — Nouvelle livraison à consulter', 'le courriel correspond à une livraison');
  verifier(emails.envoyes[1].to === utilisateurClient.email, 'la livraison est envoyée au client de la mission, pas à l’étudiant');
  verifier(emails.envoyes[1].text.includes('6 octobre 2026'), 'le courriel de livraison contient la date');
  verifier(emails.envoyes[1].text.includes(`${BASE_URL}/tableau-de-bord/livraisons?candidature=${candidature.id}`), 'le lien de livraison cible la candidature concernée');
  verifier(notifications.length === 2, 'la notification in-app de livraison reste créée');

  const livraisonAvantModification = await livraisonRepository.repository.findOne({
    where: { candidatureId: candidature.id },
  });
  livraisonRepository.setExistante(livraisonAvantModification!);
  await livraisonsService.creer(
    candidature.id,
    candidature.etudiantId,
    {} as CreerLivraisonDto,
  );
  await attendreEnvois();
  verifier(emails.envoyes.length === 2, 'la modification d’une livraison existante ne renvoie pas de doublon email');

  let statutDemande: string = StatutDemandeService.EN_ATTENTE;
  let transactionTerminee = false;
  const demande = (): DemandeService =>
    ({
      id: 'demande-x',
      clientId: utilisateurClient.id,
      client: utilisateurClient,
      service: {
        id: 'service-x',
        titre: 'Service X',
        etudiantId: etudiant.utilisateurId,
        etudiant: { utilisateur: etudiant.utilisateur },
      },
      statut: statutDemande,
      budgetPropose: 100,
      delaiSouhaite: 10,
      cahierDesCharges: 'Travail demandé',
    }) as unknown as DemandeService;

  const manager = {
    update: async () => {
      statutDemande = StatutDemandeService.ACCEPTEE;
      return { affected: 1 };
    },
  };
  const demandeRepository = {
    findOne: async () => demande(),
    manager: {
      transaction: async (callback: (manager: any) => Promise<unknown>) => {
        const resultat = await callback(manager);
        transactionTerminee = true;
        return resultat;
      },
    },
  } as unknown as Repository<DemandeService>;
  const servicesService = {
    findOne: async () => ({}),
  };
  const missionsServiceDemande = {
    creerDepuisDemandeService: async () => mission,
  };
  const candidaturesServiceDemande = {
    creerAccepteeDirectement: async () => candidature,
  };
  const demandeService = new DemandesServiceService(
    demandeRepository,
    servicesService as any,
    missionsServiceDemande as any,
    candidaturesServiceDemande as any,
    notificationsFaux,
    emails,
  );

  await demandeService.accepter('demande-x', etudiant.utilisateurId);
  await attendreEnvois();
  verifier(statutDemande === StatutDemandeService.ACCEPTEE, 'l’acceptation de la demande est enregistrée');
  verifier(transactionTerminee, 'l’email est déclenché après la transaction d’acceptation');
  verifier(emails.envoyes.length === 3, 'l’acceptation validée déclenche un email');
  verifier(emails.envoyes[2].sujet === 'Kianja — Votre demande de service a été acceptée', 'le courriel concerne l’acceptation du service');
  verifier(emails.envoyes[2].to === utilisateurClient.email, 'l’acceptation est envoyée au client demandeur uniquement');
  verifier(emails.envoyes[2].text.includes('Service X'), 'le courriel indique le service accepté');
  verifier(emails.envoyes[2].text.includes('Date :'), 'le courriel d’acceptation contient la date');
  verifier(notifications.length === 4, 'la notification in-app d’acceptation reste créée');
  let demandeDupliqueeRefusee = false;
  try {
    await demandeService.accepter('demande-x', etudiant.utilisateurId);
  } catch {
    demandeDupliqueeRefusee = true;
  }
  verifier(demandeDupliqueeRefusee, 'une acceptation déjà effectuée est refusée');
  verifier(emails.envoyes.length === 3, 'une acceptation répétée ne renvoie pas de doublon email');

  const emailsAvecEchec = new EmailsCaptures();
  emailsAvecEchec.echec = true;
  const livraisonEnEchec = new LivraisonsService(
    {
      findOne: async () => null,
      create: (data: Partial<Livraison>) => ({ ...data }),
      save: async (value: Partial<Livraison>) =>
        ({
          ...value,
          id: 'livraison-echec-email',
          dateLivraison: new Date(),
        }) as Livraison,
    } as unknown as Repository<Livraison>,
    candidaturesServiceLivraison,
    notificationsFaux,
    {} as any,
    emailsAvecEchec,
  );
  const livraisonCreee = await livraisonEnEchec.creer(
    candidature.id,
    candidature.etudiantId,
    {} as CreerLivraisonDto,
  );
  await attendreEnvois();
  verifier(livraisonCreee.id === 'livraison-echec-email', 'un échec SMTP ne fait pas échouer la création de livraison');
  verifier(notifications.length === 5, 'l’échec SMTP ne modifie pas la notification in-app');

  console.log('Tous les tests email client sont réussis.');
}

executerTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

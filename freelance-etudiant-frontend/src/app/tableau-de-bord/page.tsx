"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  BriefcaseBusiness,
  ClipboardList,
  Clock,
  Package,
  Send,
  ShieldAlert,
  TrendingUp,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type {
  Candidature,
  Livraison,
  Mission,
  NotificationItem,
  Signalement,
  Transaction,
  Utilisateur,
} from "@/lib/types";
import {
  formatArgent,
  formatDateCourte,
  statutTransactionLabel,
} from "@/lib/format";
import { calculerCompletionProfil, versNombre } from "@/lib/dashboard";
import type { ActionUrgente, EtatSection } from "@/lib/dashboard";
import {
  activiteDepuisNotifications,
  activitePlateformeAdmin,
  construireProjetsClient,
  construireProjetsEtudiant,
} from "@/lib/dashboard-activite";
import {
  construireActionsClient,
  construireActionsEtudiant,
  construireActionsRapidesClient,
} from "@/lib/dashboard-actions";

import { Button } from "@/components/ui/Button";
import { NoticeCard, StampBadge, StatCard, Tag } from "@/components/ui/Notice";
import {
  AnneauRepartition,
  BarreMensuelle,
  JaugeCirculaire,
} from "@/components/ui/Charts";
import { Skeleton, SkeletonCarte, SkeletonListe } from "@/components/ui/Skeleton";

import { ActiviteRecente } from "@/components/dashboard/ActiviteRecente";
import { CandidaturesAExaminer } from "@/components/dashboard/CandidaturesAExaminer";
import { DashboardActions } from "@/components/dashboard/DashboardActions";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  DashboardSection,
  ErreurSection,
} from "@/components/dashboard/DashboardSection";
import { ProfilCompletion } from "@/components/dashboard/ProfilCompletion";
import { ProjetsEnCours } from "@/components/dashboard/ProjetsEnCours";
import { RecommendedMissions } from "@/components/dashboard/RecommendedMissions";

// ============================================================
// CONTRATS DES DONNÉES (formes exactes renvoyées par l'API)
// ============================================================

interface StatsAdmin {
  nombreInscrits: {
    etudiants: number;
    clients: number;
    total: number;
  };
  volumeAffairesGlobal: number;
  repartitionMissionsParCategorie: {
    categorie: string;
    total: number;
  }[];
  missions: {
    total: number;
    terminees: number;
  };
}

interface StatsEtudiant {
  revenusMensuels: {
    mois: string;
    revenu: number;
  }[];
  tauxAcceptationCandidatures: number;
  missionsEnCours: number;
  totalCandidatures: number;
}

interface DonneesEtudiant {
  stats: EtatSection<StatsEtudiant>;
  candidatures: EtatSection<Candidature[]>;
  livraisons: EtatSection<Livraison[]>;
  paiements: EtatSection<Transaction[]>;
  notifications: EtatSection<NotificationItem[]>;
}

interface DonneesClient {
  missions: EtatSection<Mission[]>;
  candidatures: EtatSection<Candidature[]>;
  livraisons: EtatSection<Livraison[]>;
  paiements: EtatSection<Transaction[]>;
  notifications: EtatSection<NotificationItem[]>;
}

interface DonneesAdmin {
  stats: EtatSection<StatsAdmin>;
  signalements: EtatSection<Signalement[]>;
  paiements: EtatSection<Transaction[]>;
  utilisateurs: EtatSection<Utilisateur[]>;
}

/**
 * Charge une section en isolant les erreurs : une panne d'un endpoint
 * renvoie un état « erreur » sans interrompre les autres sections.
 */
async function chargerSection<T>(chemin: string): Promise<EtatSection<T>> {
  try {
    const donnees = await api.get<T>(chemin);
    return { statut: "succes", donnees };
  } catch (error) {
    console.error(`Erreur lors du chargement de ${chemin} :`, error);
    return { statut: "erreur" };
  }
}

// ============================================================
// PAGE : TABLEAU DE BORD (vue synthétique et actions importantes)
// ============================================================

export default function TableauDeBordVueEnsemble() {
  const { utilisateur, chargement: chargementAuth } = useAuth();

  const role = utilisateur?.role;

  const [chargement, setChargement] = useState(true);
  const [tentative, setTentative] = useState(0);
  const [donneesEtudiant, setDonneesEtudiant] =
    useState<DonneesEtudiant | null>(null);
  const [donneesClient, setDonneesClient] =
    useState<DonneesClient | null>(null);
  const [donneesAdmin, setDonneesAdmin] = useState<DonneesAdmin | null>(null);

  useEffect(() => {
    if (chargementAuth || !utilisateur || !role) {
      return;
    }

    let actif = false;
    const timer = window.setTimeout(() => {
      actif = true;
      void charger();
    }, 0);

    async function charger() {
      setChargement(true);

      // Les appels sont lancés en parallèle et chargent uniquement les
      // données nécessaires au rôle connecté.
      if (role === "etudiant") {
        const [stats, candidatures, livraisons, paiements, notifications] =
          await Promise.all([
            chargerSection<StatsEtudiant>("/statistiques/etudiant/me"),
            chargerSection<Candidature[]>("/candidatures/me"),
            chargerSection<Livraison[]>("/livraisons/me"),
            chargerSection<Transaction[]>("/paiements/recus"),
            chargerSection<NotificationItem[]>("/notifications"),
          ]);

        if (!actif) return;
        setDonneesEtudiant({
          stats,
          candidatures,
          livraisons,
          paiements,
          notifications,
        });
        setDonneesClient(null);
        setDonneesAdmin(null);
      } else if (role === "client") {
        const [missions, candidatures, livraisons, paiements, notifications] =
          await Promise.all([
            chargerSection<Mission[]>("/missions/me/mes-missions"),
            chargerSection<Candidature[]>("/candidatures/client"),
            chargerSection<Livraison[]>("/livraisons/client/toutes"),
            chargerSection<Transaction[]>("/paiements/me"),
            chargerSection<NotificationItem[]>("/notifications"),
          ]);

        if (!actif) return;
        setDonneesClient({
          missions,
          candidatures,
          livraisons,
          paiements,
          notifications,
        });
        setDonneesEtudiant(null);
        setDonneesAdmin(null);
      } else {
        const [stats, signalements, paiements, utilisateurs] =
          await Promise.all([
            chargerSection<StatsAdmin>("/statistiques/admin"),
            chargerSection<Signalement[]>("/signalements"),
            chargerSection<Transaction[]>("/paiements"),
            chargerSection<Utilisateur[]>("/admin/utilisateurs"),
          ]);

        if (!actif) return;
        setDonneesAdmin({ stats, signalements, paiements, utilisateurs });
        setDonneesEtudiant(null);
        setDonneesClient(null);
      }

      if (actif) {
        setChargement(false);
      }
    }

    return () => {
      actif = false;
      window.clearTimeout(timer);
    };
  }, [chargementAuth, utilisateur, role, tentative]);

  // Authentification encore en cours
  if (chargementAuth) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-ink-soft">Chargement de votre compte…</p>
      </div>
    );
  }

  // Pas connecté : le layout gère la redirection
  if (!utilisateur || !role) {
    return null;
  }

  // Données en cours de chargement (ou rôle sans données chargées)
  if (
    chargement ||
    (donneesEtudiant === null &&
      donneesClient === null &&
      donneesAdmin === null)
  ) {
    return <ChargementDashboard />;
  }

  return (
    <div>
      {role === "etudiant" && donneesEtudiant && (
        <VueEtudiant
          utilisateur={utilisateur}
          donnees={donneesEtudiant}
          onReessayer={() => setTentative((t) => t + 1)}
        />
      )}

      {role === "client" && donneesClient && (
        <VueClient
          utilisateur={utilisateur}
          donnees={donneesClient}
          onReessayer={() => setTentative((t) => t + 1)}
        />
      )}

      {role === "admin" && donneesAdmin && (
        <VueAdmin
          utilisateur={utilisateur}
          donnees={donneesAdmin}
          onReessayer={() => setTentative((t) => t + 1)}
        />
      )}
    </div>
  );
}

/** Squelette complet du tableau de bord pendant le premier chargement. */
function ChargementDashboard() {
  return (
    <div role="status" aria-label="Chargement du tableau de bord">
      <div className="mb-8 flex items-center gap-4">
        <Skeleton rond className="h-14 w-14" />

        <div className="flex-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-7 w-60" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCarte />
        <SkeletonCarte className="hidden sm:flex" />
        <SkeletonCarte className="hidden sm:flex" />
        <SkeletonCarte className="hidden lg:flex" />
      </div>

      <SkeletonListe nombre={3} className="mt-10" />
    </div>
  );
}

// ============================================================
// VUE ÉTUDIANT
// ============================================================

function VueEtudiant({
  utilisateur,
  donnees,
  onReessayer,
}: {
  utilisateur: Utilisateur;
  donnees: DonneesEtudiant;
  onReessayer: () => void;
}) {
  const stats =
    donnees.stats.statut === "succes"
      ? donnees.stats.donnees ?? null
      : null;
  const candidatures =
    donnees.candidatures.statut === "succes"
      ? donnees.candidatures.donnees ?? []
      : null;
  const livraisons =
    donnees.livraisons.statut === "succes"
      ? donnees.livraisons.donnees ?? []
      : null;
  const paiements =
    donnees.paiements.statut === "succes"
      ? donnees.paiements.donnees ?? []
      : null;
  const notifications =
    donnees.notifications.statut === "succes"
      ? donnees.notifications.donnees ?? []
      : null;

  const actions =
    candidatures !== null && livraisons !== null && notifications !== null
      ? construireActionsEtudiant({ candidatures, livraisons, notifications })
      : [];

  const projets =
    candidatures !== null && livraisons !== null
      ? construireProjetsEtudiant({ candidatures, livraisons })
      : [];

  const activite =
    notifications !== null ? activiteDepuisNotifications(notifications) : [];

  const completion = calculerCompletionProfil(utilisateur);

  const missionsExcluesIds = (candidatures ?? []).map(
    (candidature) => candidature.missionId,
  );

  const totalRevenusLiberes = paiements
    ? paiements
        .filter((paiement) => paiement.statut === "liberee")
        .reduce((somme, paiement) => somme + versNombre(paiement.montant), 0)
    : stats
      ? stats.revenusMensuels.reduce(
          (somme, ligne) => somme + versNombre(ligne.revenu),
          0,
        )
      : null;

  const totalEnAttente = paiements
    ? paiements
        .filter((paiement) => paiement.statut === "en_attente")
        .reduce((somme, paiement) => somme + versNombre(paiement.montant), 0)
    : 0;

  const livraisonsEnAttente = livraisons
    ? livraisons.filter((livraison) => livraison.statut === "en_attente")
        .length
    : null;

  const livraisonsCorrection = livraisons
    ? livraisons.filter((livraison) => livraison.statut === "correction_demandee")
        .length
    : 0;

  const profil = utilisateur.profilEtudiant;

  return (
    <div>
      <DashboardHeader
        utilisateur={utilisateur}
        sousTitre="Voici un résumé de votre activité."
      />

      {/* ==================== STATISTIQUES ==================== */}
      <section aria-label="Vos statistiques">
        {donnees.stats.statut === "erreur" ? (
          <ErreurSection
            message="Impossible de charger vos statistiques."
            onReessayer={onReessayer}
          />
        ) : stats === null ? (
          <div
            role="status"
            aria-label="Chargement des statistiques"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <SkeletonCarte />
            <SkeletonCarte className="hidden sm:flex" />
            <SkeletonCarte className="hidden sm:flex" />
            <SkeletonCarte className="hidden lg:flex" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Send}
              tone="brique"
              label="Candidatures"
              value={stats.totalCandidatures}
              sublabel={`Taux d'acceptation : ${stats.tauxAcceptationCandidatures} %`}
            />

            <StatCard
              icon={BriefcaseBusiness}
              tone="ocre"
              label="Missions en cours"
              value={stats.missionsEnCours}
              sublabel="Collaborations actives"
            />

            <StatCard
              icon={Package}
              tone="ink"
              label="Livraisons"
              value={livraisonsEnAttente ?? "—"}
              sublabel={`${livraisonsCorrection} correction(s) demandée(s)`}
            />

            <StatCard
              icon={Wallet}
              tone="rice"
              label="Revenus libérés"
              value={
                totalRevenusLiberes !== null
                  ? formatArgent(totalRevenusLiberes)
                  : "—"
              }
              sublabel={
                totalEnAttente > 0
                  ? `${formatArgent(totalEnAttente)} en attente`
                  : undefined
              }
            />
          </div>
        )}
      </section>

      {/* ============ REVENUS & RÉPUTATION ============ */}
      {stats !== null && (
        <DashboardSection
          titre="Revenus & réputation"
          icone={Banknote}
          className="mt-10"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BarreMensuelle
                titre="Évolution de mes revenus"
                sous_titre="Montants gagnés grâce aux livraisons validées"
                donnees={stats.revenusMensuels}
                cleValeur="revenu"
                cleLabel="mois"
                couleur="var(--color-ocre)"
                formatValeur={(v) =>
                  v >= 1000
                    ? `${Math.round(v / 1000)}k`
                    : String(Math.round(v))
                }
              />
            </div>

            <NoticeCard className="flex flex-col items-center justify-center gap-4 p-6">
              <StampBadge
                score={versNombre(profil?.scoreReputation)}
                size={90}
              />

              <div className="text-center">
                <p className="font-display text-lg font-medium">
                  Votre réputation
                </p>

                <p className="text-sm text-ink-soft">
                  {versNombre(profil?.noteMoyenne).toFixed(1)} / 5 ·{" "}
                  {profil?.nombreMissionsTerminees ?? 0} mission(s) terminée(s)
                </p>
              </div>
            </NoticeCard>
          </div>
        </DashboardSection>
      )}

      {/* ============ À FAIRE MAINTENANT ============ */}
      <DashboardSection
        titre="À faire maintenant"
        icone={Zap}
        className="mt-10"
      >
        {candidatures !== null &&
        livraisons !== null &&
        notifications !== null ? (
          <DashboardActions actions={actions} />
        ) : (
          <div role="status" aria-label="Chargement des actions">
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ MISSIONS RECOMMANDÉES ============ */}
      <DashboardSection
        titre="Missions recommandées pour vous"
        icone={TrendingUp}
        className="mt-10"
      >
        <RecommendedMissions missionsExcluesIds={missionsExcluesIds} />
      </DashboardSection>

      {/* ============ PROJETS EN COURS ============ */}
      <DashboardSection
        titre="Mes projets en cours"
        icone={BriefcaseBusiness}
        className="mt-10"
        action={
          <Link
            href="/tableau-de-bord/livraisons"
            className="text-sm font-medium text-ocre-dark hover:underline"
            aria-label="Toutes mes livraisons"
          >
            Toutes mes livraisons
          </Link>
        }
      >
        {candidatures !== null && livraisons !== null ? (
          <ProjetsEnCours projets={projets} libelleInterlocuteur="Client" />
        ) : (
          <div role="status" aria-label="Chargement des projets">
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ ACTIVITÉ RÉCENTE + PROFIL ============ */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardSection
            titre="Activité récente"
            icone={Clock}
            className="h-full"
          >
            {notifications !== null ? (
              <ActiviteRecente evenements={activite} />
            ) : donnees.notifications.statut === "erreur" ? (
              <ErreurSection
                message="Impossible de charger votre activité récente."
                onReessayer={onReessayer}
              />
            ) : (
              <div role="status" aria-label="Chargement de l'activité">
                <SkeletonListe nombre={3} />
              </div>
            )}
          </DashboardSection>
        </div>

        <div>
          <DashboardSection titre="Votre profil" icone={User} className="h-full">
            <ProfilCompletion completion={completion} />
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VUE CLIENT
// ============================================================

function VueClient({
  utilisateur,
  donnees,
  onReessayer,
}: {
  utilisateur: Utilisateur;
  donnees: DonneesClient;
  onReessayer: () => void;
}) {
  const missions =
    donnees.missions.statut === "succes" ? donnees.missions.donnees ?? [] : null;
  const candidatures =
    donnees.candidatures.statut === "succes"
      ? donnees.candidatures.donnees ?? []
      : null;
  const livraisons =
    donnees.livraisons.statut === "succes"
      ? donnees.livraisons.donnees ?? []
      : null;
  const paiements =
    donnees.paiements.statut === "succes"
      ? donnees.paiements.donnees ?? []
      : null;
  const notifications =
    donnees.notifications.statut === "succes"
      ? donnees.notifications.donnees ?? []
      : null;

  const missionsEnCours =
    missions?.filter((mission) => mission.statut === "en_cours") ?? [];
  const missionsTerminees =
    missions?.filter((mission) => mission.statut === "terminee") ?? [];
  const candidaturesEnAttente =
    candidatures?.filter((candidature) => candidature.statut === "en_attente") ??
    [];
  const livraisonsAValider =
    livraisons?.filter((livraison) => livraison.statut === "en_attente") ?? [];

  const depensesEngagees = paiements
    ? paiements
        .filter(
          (paiement) =>
            paiement.statut === "confirmee" || paiement.statut === "liberee",
        )
        .reduce((somme, paiement) => somme + versNombre(paiement.montant), 0)
    : null;

  const depensesEnAttente = paiements
    ? paiements
        .filter((paiement) => paiement.statut === "en_attente")
        .reduce((somme, paiement) => somme + versNombre(paiement.montant), 0)
    : 0;

  const actionsRapides = construireActionsRapidesClient();

  const actionsUrgentes =
    candidatures !== null && livraisons !== null && paiements !== null
      ? construireActionsClient({ candidatures, livraisons, paiements })
      : [];

  const projets =
    missions !== null && candidatures !== null && livraisons !== null
      ? construireProjetsClient({ missions, candidatures, livraisons })
      : [];

  const activite =
    notifications !== null ? activiteDepuisNotifications(notifications) : [];

  const derniersPaiements = paiements ? paiements.slice(0, 3) : null;

  return (
    <div>
      <DashboardHeader
        utilisateur={utilisateur}
        sousTitre="Voici l'état de vos projets."
      />

      {/* ==================== STATISTIQUES ==================== */}
      <section aria-label="État de vos projets">
        {missions === null || candidatures === null ? (
          donnees.missions.statut === "erreur" &&
          donnees.candidatures.statut === "erreur" ? (
            <ErreurSection
              message="Impossible de charger l'état de vos projets."
              onReessayer={onReessayer}
            />
          ) : (
            <div
              role="status"
              aria-label="Chargement des statistiques"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <SkeletonCarte />
              <SkeletonCarte className="hidden sm:flex" />
              <SkeletonCarte className="hidden sm:flex" />
              <SkeletonCarte className="hidden lg:flex" />
            </div>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={BriefcaseBusiness}
              tone="ocre"
              label="Missions publiées"
              value={missions.length}
              sublabel={`${missionsEnCours.length} en cours · ${missionsTerminees.length} terminée(s)`}
            />

            <StatCard
              icon={ClipboardList}
              tone="rice"
              label="Candidatures reçues"
              value={candidatures.length}
              sublabel={`${candidaturesEnAttente.length} en attente d'examen`}
            />

            <StatCard
              icon={Package}
              tone="ink"
              label="Livraisons à valider"
              value={livraisons === null ? "—" : livraisonsAValider.length}
              sublabel="Déposées par les étudiants"
            />

            <StatCard
              icon={Wallet}
              tone="brique"
              label="Dépenses engagées"
              value={
                depensesEngagees !== null
                  ? formatArgent(depensesEngagees)
                  : "—"
              }
              sublabel={
                depensesEnAttente > 0
                  ? `${formatArgent(depensesEnAttente)} en attente de vérification`
                  : undefined
              }
            />
          </div>
        )}
      </section>

      {/* ============ ACTIONS RAPIDES ============ */}
      <DashboardSection titre="Actions rapides" icone={Zap} className="mt-10">
        <DashboardActions actions={actionsRapides} variante="rapide" />
      </DashboardSection>

      {/* ============ À FAIRE MAINTENANT ============ */}
      <DashboardSection
        titre="À faire maintenant"
        icone={Clock}
        className="mt-10"
      >
        {candidatures !== null && livraisons !== null && paiements !== null ? (
          <DashboardActions actions={actionsUrgentes} />
        ) : (
          <div role="status" aria-label="Chargement des actions">
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ CANDIDATURES À EXAMINER ============ */}
      <DashboardSection
        titre="Candidatures à examiner"
        icone={ClipboardList}
        className="mt-10"
        action={
          <Link
            href="/tableau-de-bord/mes-missions"
            className="text-sm font-medium text-ocre-dark hover:underline"
            aria-label="Toutes les candidatures"
          >
            Tout voir
          </Link>
        }
      >
        <CandidaturesAExaminer
          etat={donnees.candidatures}
          onReessayer={onReessayer}
        />
      </DashboardSection>

      {/* ============ MISSIONS EN COURS ============ */}
      <DashboardSection
        titre="Missions en cours"
        icone={BriefcaseBusiness}
        className="mt-10"
      >
        {missions !== null && candidatures !== null && livraisons !== null ? (
          <ProjetsEnCours
            projets={projets}
            libelleInterlocuteur="Étudiant"
            videTitre="Aucune mission en cours."
            videDescription="Publiez une mission ou acceptez une candidature pour démarrer un projet."
            videHref="/tableau-de-bord/mes-missions"
            videLibelle="Publier une mission"
          />
        ) : (
          <div role="status" aria-label="Chargement des missions">
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ DERNIERS PAIEMENTS ============ */}
      <DashboardSection
        titre="Derniers paiements"
        icone={Wallet}
        className="mt-10"
        action={
          <Link
            href="/tableau-de-bord/paiements"
            className="text-sm font-medium text-ocre-dark hover:underline"
            aria-label="Tous les paiements"
          >
            Tout voir
          </Link>
        }
      >
        {derniersPaiements === null ? (
          donnees.paiements.statut === "erreur" ? (
            <ErreurSection
              message="Impossible de charger vos paiements."
              onReessayer={onReessayer}
            />
          ) : (
            <div role="status" aria-label="Chargement des paiements">
              <SkeletonListe nombre={2} />
            </div>
          )
        ) : derniersPaiements.length === 0 ? (
          <NoticeCard className="flex flex-col items-start gap-3">
            <p className="font-display font-medium">
              Aucun paiement pour le moment.
            </p>
            <p className="text-sm text-ink-soft">
              Déclarez un paiement après validation d&apos;une livraison pour
              sécuriser la transaction.
            </p>

            <Link
              href="/tableau-de-bord/paiements"
              aria-label="Déclarer un paiement"
            >
              <Button size="sm">Déclarer un paiement</Button>
            </Link>
          </NoticeCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {derniersPaiements.map((paiement) => (
              <NoticeCard key={paiement.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-display font-medium">
                    {paiement.candidature?.mission?.titre ?? "Mission"}
                  </p>

                  <Tag
                    tone={
                      paiement.statut === "annulee" ? "brique" : "rice"
                    }
                  >
                    {statutTransactionLabel[paiement.statut]}
                  </Tag>
                </div>

                <p className="font-mono text-sm text-ocre-dark">
                  {formatArgent(paiement.montant)}
                </p>

                <p className="text-xs text-ink-soft/60">
                  {paiement.etudiant?.nom ?? "Étudiant"} ·{" "}
                  {formatDateCourte(paiement.dateCreation)}
                </p>
              </NoticeCard>
            ))}
          </div>
        )}
      </DashboardSection>

      {/* ============ ACTIVITÉ RÉCENTE ============ */}
      <DashboardSection
        titre="Activité récente"
        icone={Clock}
        className="mt-10"
      >
        {notifications !== null ? (
          <ActiviteRecente
            evenements={activite}
            videTitre="Aucune activité pour le moment."
            videDescription="Candidatures reçues, livraisons déposées et messages apparaîtront ici."
          />
        ) : donnees.notifications.statut === "erreur" ? (
          <ErreurSection
            message="Impossible de charger votre activité récente."
            onReessayer={onReessayer}
          />
        ) : (
          <div role="status" aria-label="Chargement de l'activité">
            <SkeletonListe nombre={3} />
          </div>
        )}
      </DashboardSection>
    </div>
  );
}

// ============================================================
// VUE ADMIN
// ============================================================

function VueAdmin({
  utilisateur,
  donnees,
  onReessayer,
}: {
  utilisateur: Utilisateur;
  donnees: DonneesAdmin;
  onReessayer: () => void;
}) {
  const stats =
    donnees.stats.statut === "succes"
      ? donnees.stats.donnees ?? null
      : null;
  const signalements =
    donnees.signalements.statut === "succes"
      ? donnees.signalements.donnees ?? []
      : null;
  const paiements =
    donnees.paiements.statut === "succes"
      ? donnees.paiements.donnees ?? []
      : null;
  const utilisateurs =
    donnees.utilisateurs.statut === "succes"
      ? donnees.utilisateurs.donnees ?? []
      : null;

  const paiementsEnAttente =
    paiements?.filter((paiement) => paiement.statut === "en_attente") ?? [];
  const paiementsTraites =
    paiements?.filter(
      (paiement) =>
        paiement.statut !== "en_attente" && paiement.statut !== "annulee",
    ) ?? [];
  const signalementsOuverts =
    signalements?.filter((signalement) => signalement.statut !== "traite") ??
    [];
  const comptesSuspendus =
    utilisateurs?.filter((utilisateur) => utilisateur.estSuspendu) ?? [];

  // « À surveiller » : uniquement les problèmes réellement détectés.
  const surveillance: ActionUrgente[] = [];

  if (signalements !== null && signalementsOuverts.length > 0) {
    surveillance.push({
      id: "signalements",
      priorite: 10,
      icone: ShieldAlert,
      ton: "brique",
      titre: `${signalementsOuverts.length} signalement(s) à traiter`,
      description:
        "Des signalements de la communauté attendent une modération.",
      libelleAction: "Ouvrir les signalements",
      href: "/tableau-de-bord/admin/signalements",
    });
  }

  if (paiements !== null && paiementsEnAttente.length > 0) {
    surveillance.push({
      id: "paiements-attente",
      priorite: 20,
      icone: Wallet,
      ton: "ocre",
      titre: `${paiementsEnAttente.length} paiement(s) à vérifier`,
      description:
        "Des paiements déclarés attendent la confirmation des fonds.",
      libelleAction: "Vérifier les paiements",
      href: "/tableau-de-bord/admin/paiements",
    });
  }

  if (utilisateurs !== null && comptesSuspendus.length > 0) {
    surveillance.push({
      id: "comptes-suspendus",
      priorite: 30,
      icone: Users,
      ton: "ink",
      titre: `${comptesSuspendus.length} compte(s) suspendu(s)`,
      description:
        "Des comptes sont actuellement suspendus et nécessitent peut-être un suivi.",
      libelleAction: "Gérer les comptes",
      href: "/tableau-de-bord/admin",
    });
  }

  const activite =
    signalements !== null && paiements !== null
      ? activitePlateformeAdmin({ signalements, paiements })
      : [];

  return (
    <div>
      <DashboardHeader
        utilisateur={utilisateur}
        sousTitre="Vue globale de la plateforme."
      />

      {/* ==================== STATISTIQUES GLOBALES ==================== */}
      <section aria-label="Statistiques globales">
        {donnees.stats.statut === "erreur" ? (
          <ErreurSection
            message="Impossible de charger les statistiques globales."
            onReessayer={onReessayer}
          />
        ) : stats === null ? (
          <div
            role="status"
            aria-label="Chargement des statistiques"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <SkeletonCarte />
            <SkeletonCarte className="hidden sm:flex" />
            <SkeletonCarte className="hidden sm:flex" />
            <SkeletonCarte className="hidden lg:flex" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              tone="ocre"
              label="Utilisateurs inscrits"
              value={stats.nombreInscrits.total}
              sublabel={`${stats.nombreInscrits.etudiants} étudiants · ${stats.nombreInscrits.clients} clients`}
            />

            <StatCard
              icon={BriefcaseBusiness}
              tone="rice"
              label="Missions publiées"
              value={stats.missions.total}
              sublabel={`${stats.missions.terminees} livraison(s) validée(s)`}
            />

            <StatCard
              icon={Banknote}
              tone="brique"
              label="Volume d'affaires"
              value={formatArgent(stats.volumeAffairesGlobal)}
              sublabel="Livraisons validées"
            />

            <StatCard
              icon={Wallet}
              tone="ink"
              label="Paiements traités"
              value={paiements === null ? "—" : paiementsTraites.length}
              sublabel={
                paiements === null
                  ? undefined
                  : `${paiementsEnAttente.length} en attente de vérification`
              }
            />
          </div>
        )}
      </section>

      {/* ============ À SURVEILLER ============ */}
      <DashboardSection
        titre="À surveiller"
        icone={ShieldAlert}
        className="mt-10"
      >
        {signalements !== null &&
        paiements !== null &&
        utilisateurs !== null ? (
          <DashboardActions
            actions={surveillance}
            libelleVide="Rien à signaler"
            descriptionVide="La plateforme fonctionne normalement."
          />
        ) : (
          <div role="status" aria-label="Chargement de la surveillance">
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ INDICATEURS ============ */}
      <DashboardSection
        titre="Indicateurs"
        icone={TrendingUp}
        className="mt-10"
      >
        {stats === null ? (
          <div role="status" aria-label="Chargement des indicateurs">
            <SkeletonListe nombre={1} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <AnneauRepartition
              titre="Répartition des missions par catégorie"
              sous_titre="Part de chaque catégorie dans l'ensemble des missions publiées"
              donnees={stats.repartitionMissionsParCategorie}
              cleValeur="total"
              cleLabel="categorie"
            />

            <NoticeCard className="flex flex-col items-center justify-center gap-6 p-6">
              <JaugeCirculaire
                valeur={
                  stats.missions.total > 0
                    ? (stats.missions.terminees / stats.missions.total) * 100
                    : 0
                }
                label={
                  <>
                    Missions livrées
                    <br />
                    et validées
                  </>
                }
                couleur="var(--color-brique)"
              />

              <p className="text-center text-sm text-ink-soft">
                {stats.missions.terminees} livraison(s) validée(s) sur{" "}
                {stats.missions.total} mission(s) publiée(s).
              </p>
            </NoticeCard>
          </div>
        )}
      </DashboardSection>

      {/* ============ ACTIVITÉ PLATEFORME ============ */}
      <DashboardSection
        titre="Activité plateforme"
        icone={Clock}
        className="mt-10"
      >
        {signalements !== null && paiements !== null ? (
          <ActiviteRecente
            evenements={activite}
            videTitre="Aucune activité récente."
            videDescription="Signalements et paiements apparaîtront ici."
          />
        ) : (
          <div role="status" aria-label="Chargement de l'activité plateforme">
            <SkeletonListe nombre={3} />
          </div>
        )}
      </DashboardSection>
    </div>
  );
}
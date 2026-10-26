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
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useOptionLabels } from "@/i18n/use-option-labels";
import { calculerCompletionProfil, versNombre } from "@/lib/dashboard";
import type { ActionUrgente, EtatSection, Traducteur } from "@/lib/dashboard";
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
  const t = useTranslations("dashboardPages.overview");

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
        <p className="text-sm text-ink-soft">{t("loadingAccount")}</p>
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
      {/*
        Flèche « ← Retour » : sur le tableau de bord, elle permet de
        revenir à la page consultée juste avant (accueil public, missions,
        services…) via l'historique navigateur — jamais une redirection
        fixe.
      */}
      
      {role === "etudiant" && donneesEtudiant && (
        <VueEtudiant
          utilisateur={utilisateur}
          donnees={donneesEtudiant}
          onReessayer={() => setTentative((n) => n + 1)}
        />
      )}

      {role === "client" && donneesClient && (
        <VueClient
          utilisateur={utilisateur}
          donnees={donneesClient}
          onReessayer={() => setTentative((n) => n + 1)}
        />
      )}

      {role === "admin" && donneesAdmin && (
        <VueAdmin
          utilisateur={utilisateur}
          donnees={donneesAdmin}
          onReessayer={() => setTentative((n) => n + 1)}
        />
      )}
    </div>
  );
}

/** Squelette complet du tableau de bord pendant le premier chargement. */
function ChargementDashboard() {
  const t = useTranslations("dashboardPages.overview");
  return (
    <div role="status" aria-label={t("loadingDashboard")}>
      <div className="mb-7 flex items-center gap-4">
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

      <SkeletonListe nombre={3} className="mt-8" />
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
  const t = useTranslations("dashboardPages.overview");
  const tl = useTranslations(
    "dashboardPages.dashboardLib",
  ) as unknown as Traducteur;
  const {
    argent: formatArgent,
    dateCourte: formatDateCourte,
  } = useFormats();
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
      ? construireActionsEtudiant({
          candidatures,
          livraisons,
          notifications,
          t: tl,
          formatDate: formatDateCourte,
        })
      : [];

  const projets =
    candidatures !== null && livraisons !== null
      ? construireProjetsEtudiant({ candidatures, livraisons, t: tl })
      : [];

  const activite =
    notifications !== null ? activiteDepuisNotifications(notifications, tl) : [];

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

  // ============================================================
  // SUPPRESSION D'ACTIVITÉ (notifications de l'utilisateur)
  // L'activité récente est dérivée des notifications réelles :
  // supprimer une activité = supprimer la notification correspondante
  // (endpoint DELETE /notifications/:id, permissions vérifiées côté
  // backend). Suppression optimiste avec annulation en cas d'échec.
  // ============================================================
  const [idsActiviteSupprimes, setIdsActiviteSupprimes] = useState<
    Set<string>
  >(new Set());
  const [suppressionEnCoursId, setSuppressionEnCoursId] = useState<
    string | null
  >(null);
  const [effacementEnCours, setEffacementEnCours] = useState(false);

  const activiteFiltree = activite.filter(
    (evenement) => !idsActiviteSupprimes.has(evenement.id),
  );

  async function supprimerActivite(idEvenement: string) {
    setSuppressionEnCoursId(idEvenement);

    // Optimiste : on retire immédiatement l'activité de la timeline.
    setIdsActiviteSupprimes((prev) => new Set(prev).add(idEvenement));

    try {
      await api.delete(`/notifications/${idEvenement}`);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'activité :", error);
      // Échec : on restaure l'activité dans la timeline.
      setIdsActiviteSupprimes((prev) => {
        const suivant = new Set(prev);
        suivant.delete(idEvenement);
        return suivant;
      });
    } finally {
      setSuppressionEnCoursId(null);
    }
  }

  async function toutEffacerActivite() {
    if (activiteFiltree.length === 0) return;

    if (!window.confirm(t("confirmClear"))) {
      return;
    }

    setEffacementEnCours(true);
    const idsAffiches = activiteFiltree.map((e) => e.id);

    // Optimiste : toutes les activités affichées disparaissent.
    setIdsActiviteSupprimes((prev) => {
      const suivant = new Set(prev);
      for (const id of idsAffiches) suivant.add(id);
      return suivant;
    });

    try {
      await api.delete("/notifications/tout-supprimer");
    } catch (error) {
      console.error("Erreur lors de l'effacement de l'activité :", error);
      // Échec : on restaure l'état initial.
      setIdsActiviteSupprimes((prev) => {
        const suivant = new Set(prev);
        for (const id of idsAffiches) suivant.delete(id);
        return suivant;
      });
    } finally {
      setEffacementEnCours(false);
    }
  }

  return (
    <div>
      <DashboardHeader
        utilisateur={utilisateur}
        sousTitre={t("subtitleStudent")}
      />

      {/* ==================== STATISTIQUES ==================== */}
      <section aria-label={t("yourStats")}>
        {donnees.stats.statut === "erreur" ? (
          <ErreurSection
            message={t("statsLoadError")}
            onReessayer={onReessayer}
          />
        ) : stats === null ? (
          <div
            role="status"
            aria-label={t("loadingStats")}
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
              tone="ocre"
              label={t("applications")}
              value={stats.totalCandidatures}
              sublabel={t("acceptanceRate", {
                taux: stats.tauxAcceptationCandidatures,
              })}
            />

            <StatCard
              icon={BriefcaseBusiness}
              tone="ocre"
              label={t("ongoingMissions")}
              value={stats.missionsEnCours}
              sublabel={t("activeCollaborations")}
            />

            <StatCard
              icon={Package}
              tone="ink"
              label={t("deliveries")}
              value={livraisonsEnAttente ?? "—"}
              sublabel={t("correctionsRequested", {
                count: livraisonsCorrection,
              })}
            />

            <StatCard
              icon={Wallet}
              tone="ocre"
              label={t("releasedIncome")}
              value={
                totalRevenusLiberes !== null
                  ? formatArgent(totalRevenusLiberes)
                  : "—"
              }
              sublabel={
                totalEnAttente > 0
                  ? t("pendingAmount", { montant: formatArgent(totalEnAttente) })
                  : undefined
              }
            />
          </div>
        )}
      </section>

      {/* ============ REVENUS & RÉPUTATION ============ */}
      {stats !== null && (
        <DashboardSection
          titre={t("incomeReputation")}
          icone={Banknote}
          className="mt-8"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BarreMensuelle
                titre={t("incomeEvolution")}
                sous_titre={t("incomeEvolutionSub")}
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
                  {t("yourReputation")}
                </p>

                <p className="text-sm text-ink-soft">
                  {t("reputationSummary", {
                    note: versNombre(profil?.noteMoyenne).toFixed(1),
                    count: profil?.nombreMissionsTerminees ?? 0,
                  })}
                </p>
              </div>
            </NoticeCard>
          </div>
        </DashboardSection>
      )}

      {/* ============ À FAIRE MAINTENANT ============ */}
      <DashboardSection
        titre={t("todoNow")}
        icone={Zap}
        className="mt-8"
      >
        {candidatures !== null &&
        livraisons !== null &&
        notifications !== null ? (
          <DashboardActions actions={actions} />
        ) : (
          <div role="status" aria-label={t("loadingActions")}>
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ MISSIONS RECOMMANDÉES ============ */}
      <DashboardSection
        titre={t("recommendedMissions")}
        icone={TrendingUp}
        className="mt-8"
      >
        <RecommendedMissions missionsExcluesIds={missionsExcluesIds} />
      </DashboardSection>

      {/* ============ PROJETS EN COURS ============ */}
      <DashboardSection
        titre={t("myOngoingProjects")}
        icone={BriefcaseBusiness}
        className="mt-8"
        action={
          <Link
            href="/tableau-de-bord/livraisons"
            className="text-sm font-medium text-ocre-dark hover:underline"
            aria-label={t("allMyDeliveries")}
          >
            {t("allMyDeliveries")}
          </Link>
        }
      >
        {candidatures !== null && livraisons !== null ? (
          <ProjetsEnCours projets={projets} libelleInterlocuteur={t("clientLabel")} />
        ) : (
          <div role="status" aria-label={t("loadingProjects")}>
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ ACTIVITÉ RÉCENTE + PROFIL ============ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardSection
            titre={t("recentActivity")}
            icone={Clock}
            className="h-full"
          >
            {notifications !== null ? (
              <ActiviteRecente
                evenements={activiteFiltree}
                onSupprimer={supprimerActivite}
                suppressionEnCoursId={suppressionEnCoursId}
                onToutEffacer={toutEffacerActivite}
                effacementEnCours={effacementEnCours}
              />
            ) : donnees.notifications.statut === "erreur" ? (
              <ErreurSection
                message={t("activityLoadError")}
                onReessayer={onReessayer}
              />
            ) : (
              <div role="status" aria-label={t("loadingActivity")}>
                <SkeletonListe nombre={3} />
              </div>
            )}
          </DashboardSection>
        </div>

        <div>
          <DashboardSection titre={t("yourProfile")} icone={User} className="h-full">
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
  const t = useTranslations("dashboardPages.overview");
  const tl = useTranslations(
    "dashboardPages.dashboardLib",
  ) as unknown as Traducteur;
  const {
    argent: formatArgent,
    dateCourte: formatDateCourte,
  } = useFormats();
  const { statutTransaction: libelleStatutTransaction } = useLabels();
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

  const actionsRapides = construireActionsRapidesClient(tl);

  const actionsUrgentes =
    candidatures !== null && livraisons !== null && paiements !== null
      ? construireActionsClient({ candidatures, livraisons, paiements, t: tl })
      : [];

  const projets =
    missions !== null && candidatures !== null && livraisons !== null
      ? construireProjetsClient({ missions, candidatures, livraisons, t: tl })
      : [];

  const activite =
    notifications !== null ? activiteDepuisNotifications(notifications, tl) : [];

  const derniersPaiements = paiements ? paiements.slice(0, 3) : null;

  // ============================================================
  // SUPPRESSION D'ACTIVITÉ (notifications de l'utilisateur) —
  // même mécanisme que la vue étudiant : supprimer une activité
  // supprime la notification sous-jacente (permissions vérifiées
  // côté backend). Suppression optimiste avec annulation en cas
  // d'échec.
  // ============================================================
  const [idsActiviteSupprimes, setIdsActiviteSupprimes] = useState<
    Set<string>
  >(new Set());
  const [suppressionEnCoursId, setSuppressionEnCoursId] = useState<
    string | null
  >(null);
  const [effacementEnCours, setEffacementEnCours] = useState(false);

  const activiteFiltree = activite.filter(
    (evenement) => !idsActiviteSupprimes.has(evenement.id),
  );

  async function supprimerActivite(idEvenement: string) {
    setSuppressionEnCoursId(idEvenement);
    setIdsActiviteSupprimes((prev) => new Set(prev).add(idEvenement));

    try {
      await api.delete(`/notifications/${idEvenement}`);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'activité :", error);
      setIdsActiviteSupprimes((prev) => {
        const suivant = new Set(prev);
        suivant.delete(idEvenement);
        return suivant;
      });
    } finally {
      setSuppressionEnCoursId(null);
    }
  }

  async function toutEffacerActivite() {
    if (activiteFiltree.length === 0) return;

    if (!window.confirm(t("confirmClear"))) {
      return;
    }

    setEffacementEnCours(true);
    const idsAffiches = activiteFiltree.map((e) => e.id);

    setIdsActiviteSupprimes((prev) => {
      const suivant = new Set(prev);
      for (const id of idsAffiches) suivant.add(id);
      return suivant;
    });

    try {
      await api.delete("/notifications/tout-supprimer");
    } catch (error) {
      console.error("Erreur lors de l'effacement de l'activité :", error);
      setIdsActiviteSupprimes((prev) => {
        const suivant = new Set(prev);
        for (const id of idsAffiches) suivant.delete(id);
        return suivant;
      });
    } finally {
      setEffacementEnCours(false);
    }
  }

  return (
    <div>
      <DashboardHeader
        utilisateur={utilisateur}
        sousTitre={t("subtitleClient")}
      />

      {/* ==================== STATISTIQUES ==================== */}
      <section aria-label={t("projectsState")}>
        {missions === null || candidatures === null ? (
          donnees.missions.statut === "erreur" &&
          donnees.candidatures.statut === "erreur" ? (
            <ErreurSection
              message={t("projectsLoadError")}
              onReessayer={onReessayer}
            />
          ) : (
            <div
              role="status"
              aria-label={t("loadingStats")}
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
              label={t("publishedMissions")}
              value={missions.length}
              sublabel={t("missionsBreakdown", {
                enCours: missionsEnCours.length,
                terminees: missionsTerminees.length,
              })}
            />

            <StatCard
              icon={ClipboardList}
              tone="ocre"
              label={t("applicationsReceived")}
              value={candidatures.length}
              sublabel={t("awaitingReview", {
                count: candidaturesEnAttente.length,
              })}
            />

            <StatCard
              icon={Package}
              tone="ink"
              label={t("deliveriesToValidate")}
              value={livraisons === null ? "—" : livraisonsAValider.length}
              sublabel={t("submittedByStudents")}
            />

            <StatCard
              icon={Wallet}
              tone="ocre"
              label={t("committedSpending")}
              value={
                depensesEngagees !== null
                  ? formatArgent(depensesEngagees)
                  : "—"
              }
              sublabel={
                depensesEnAttente > 0
                  ? t("pendingVerification", {
                      montant: formatArgent(depensesEnAttente),
                    })
                  : undefined
              }
            />
          </div>
        )}
      </section>

      {/* ============ ACTIONS RAPIDES ============ */}
      <DashboardSection titre={t("quickActions")} icone={Zap} className="mt-8">
        <DashboardActions actions={actionsRapides} variante="rapide" />
      </DashboardSection>

      {/* ============ À FAIRE MAINTENANT ============ */}
      <DashboardSection
        titre={t("todoNow")}
        icone={Clock}
        className="mt-8"
      >
        {candidatures !== null && livraisons !== null && paiements !== null ? (
          <DashboardActions actions={actionsUrgentes} />
        ) : (
          <div role="status" aria-label={t("loadingActions")}>
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ CANDIDATURES À EXAMINER ============ */}
      <DashboardSection
        titre={t("applicationsToReview")}
        icone={ClipboardList}
        className="mt-8"
        action={
          <Link
            href="/tableau-de-bord/mes-missions"
            className="text-sm font-medium text-ocre-dark hover:underline"
            aria-label={t("allApplications")}
          >
            {t("seeAll")}
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
        titre={t("ongoingMissionsTitle")}
        icone={BriefcaseBusiness}
        className="mt-8"
      >
        {missions !== null && candidatures !== null && livraisons !== null ? (
          <ProjetsEnCours
            projets={projets}
            libelleInterlocuteur={t("studentLabel")}
            videTitre={t("noOngoingMission")}
            videDescription={t("noOngoingMissionHint")}
            videHref="/tableau-de-bord/mes-missions"
            videLibelle={t("publishMission")}
          />
        ) : (
          <div role="status" aria-label={t("loadingMissions")}>
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ DERNIERS PAIEMENTS ============ */}
      <DashboardSection
        titre={t("latestPayments")}
        icone={Wallet}
        className="mt-8"
        action={
          <Link
            href="/tableau-de-bord/paiements"
            className="text-sm font-medium text-ocre-dark hover:underline"
            aria-label={t("allPayments")}
          >
            {t("seeAll")}
          </Link>
        }
      >
        {derniersPaiements === null ? (
          donnees.paiements.statut === "erreur" ? (
            <ErreurSection
              message={t("paymentsLoadError")}
              onReessayer={onReessayer}
            />
          ) : (
            <div role="status" aria-label={t("loadingPayments")}>
              <SkeletonListe nombre={2} />
            </div>
          )
        ) : derniersPaiements.length === 0 ? (
          <NoticeCard className="flex flex-col items-start gap-3">
            <p className="font-display font-medium">
              {t("noPayment")}
            </p>
            <p className="text-sm text-ink-soft">
              {t("noPaymentHint")}
            </p>

            <Link
              href="/tableau-de-bord/paiements"
              aria-label={t("declarePayment")}
            >
              <Button size="sm">{t("declarePayment")}</Button>
            </Link>
          </NoticeCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {derniersPaiements.map((paiement) => (
              <NoticeCard key={paiement.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-display font-medium">
                    {paiement.candidature?.mission?.titre ?? t("missionFallback")}
                  </p>

                  <Tag
                    tone={
                      paiement.statut === "annulee" ? "brique" : "rice"
                    }
                  >
                    {libelleStatutTransaction(paiement.statut)}
                  </Tag>
                </div>

                <p className="font-mono text-sm text-ocre-dark">
                  {formatArgent(paiement.montant)}
                </p>

                <p className="text-xs text-ink-soft/60">
                  {paiement.etudiant?.nom ?? t("studentLabel")} ·{" "}
                  {formatDateCourte(paiement.dateCreation)}
                </p>
              </NoticeCard>
            ))}
          </div>
        )}
      </DashboardSection>

      {/* ============ ACTIVITÉ RÉCENTE ============ */}
      <DashboardSection
        titre={t("recentActivity")}
        icone={Clock}
        className="mt-8"
      >
        {notifications !== null ? (
          <ActiviteRecente
            evenements={activiteFiltree}
            videTitre={t("noActivity")}
            videDescription={t("noActivityClientHint")}
            onSupprimer={supprimerActivite}
            suppressionEnCoursId={suppressionEnCoursId}
            onToutEffacer={toutEffacerActivite}
            effacementEnCours={effacementEnCours}
          />
        ) : donnees.notifications.statut === "erreur" ? (
          <ErreurSection
            message={t("activityLoadError")}
            onReessayer={onReessayer}
          />
        ) : (
          <div role="status" aria-label={t("loadingActivity")}>
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
  const t = useTranslations("dashboardPages.overview");
  const tl = useTranslations(
    "dashboardPages.dashboardLib",
  ) as unknown as Traducteur;
  const { argent: formatArgent, nombre: formatNombre } = useFormats();
  const { statutTransaction: libelleStatutTransaction } = useLabels();
  const { categorie: libelleCategorie } = useOptionLabels();
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
      titre: t("reportsToHandle", { count: signalementsOuverts.length }),
      description: t("reportsToHandleHint"),
      libelleAction: t("openReports"),
      href: "/tableau-de-bord/admin/signalements",
    });
  }

  if (paiements !== null && paiementsEnAttente.length > 0) {
    surveillance.push({
      id: "paiements-attente",
      priorite: 20,
      icone: Wallet,
      ton: "ocre",
      titre: t("paymentsToVerify", { count: paiementsEnAttente.length }),
      description: t("paymentsToVerifyHint"),
      libelleAction: t("verifyPayments"),
      href: "/tableau-de-bord/admin/paiements",
    });
  }

  if (utilisateurs !== null && comptesSuspendus.length > 0) {
    surveillance.push({
      id: "comptes-suspendus",
      priorite: 30,
      icone: Users,
      ton: "ink",
      titre: t("suspendedAccounts", { count: comptesSuspendus.length }),
      description: t("suspendedAccountsHint"),
      libelleAction: t("manageAccounts"),
      href: "/tableau-de-bord/admin",
    });
  }

  const activite =
    signalements !== null && paiements !== null
      ? activitePlateformeAdmin({
          signalements,
          paiements,
          t: tl,
          libelleStatutTransaction,
          formatNombre: (valeur) => formatNombre(valeur),
        })
      : [];

  return (
    <div>
      <DashboardHeader
        utilisateur={utilisateur}
        sousTitre={t("subtitleAdmin")}
      />

      {/* ==================== STATISTIQUES GLOBALES ==================== */}
      <section aria-label={t("globalStats")}>
        {donnees.stats.statut === "erreur" ? (
          <ErreurSection
            message={t("globalStatsLoadError")}
            onReessayer={onReessayer}
          />
        ) : stats === null ? (
          <div
            role="status"
            aria-label={t("loadingStats")}
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
              label={t("registeredUsers")}
              value={stats.nombreInscrits.total}
              sublabel={t("usersBreakdown", {
                etudiants: stats.nombreInscrits.etudiants,
                clients: stats.nombreInscrits.clients,
              })}
            />

            <StatCard
              icon={BriefcaseBusiness}
              tone="ocre"
              label={t("publishedMissions")}
              value={stats.missions.total}
              sublabel={t("validatedDeliveries", {
                count: stats.missions.terminees,
              })}
            />

            <StatCard
              icon={Banknote}
              tone="ocre"
              label={t("businessVolume")}
              value={formatArgent(stats.volumeAffairesGlobal)}
              sublabel={t("validatedDeliveriesLabel")}
            />

            <StatCard
              icon={Wallet}
              tone="ink"
              label={t("processedPayments")}
              value={paiements === null ? "—" : paiementsTraites.length}
              sublabel={
                paiements === null
                  ? undefined
                  : t("paymentsAwaiting", {
                      count: paiementsEnAttente.length,
                    })
              }
            />
          </div>
        )}
      </section>

      {/* ============ À SURVEILLER ============ */}
      <DashboardSection
        titre={t("toWatch")}
        icone={ShieldAlert}
        className="mt-8"
      >
        {signalements !== null &&
        paiements !== null &&
        utilisateurs !== null ? (
          <DashboardActions
            actions={surveillance}
            libelleVide={t("nothingToReport")}
            descriptionVide={t("platformNormal")}
          />
        ) : (
          <div role="status" aria-label={t("loadingWatch")}>
            <SkeletonListe nombre={2} />
          </div>
        )}
      </DashboardSection>

      {/* ============ INDICATEURS ============ */}
      <DashboardSection
        titre={t("indicators")}
        icone={TrendingUp}
        className="mt-8"
      >
        {stats === null ? (
          <div role="status" aria-label={t("loadingIndicators")}>
            <SkeletonListe nombre={1} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <AnneauRepartition
              titre={t("missionsByCategory")}
              sous_titre={t("missionsByCategorySub")}
              donnees={stats.repartitionMissionsParCategorie.map((ligne) => ({
                ...ligne,
                categorie: libelleCategorie(ligne.categorie),
              }))}
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
                    {t("gaugeLine1")}
                    <br />
                    {t("gaugeLine2")}
                  </>
                }
                couleur="var(--color-ocre-dark)"
              />

              <p className="text-center text-sm text-ink-soft">
                {t("gaugeSummary", {
                  terminees: stats.missions.terminees,
                  total: stats.missions.total,
                })}
              </p>
            </NoticeCard>
          </div>
        )}
      </DashboardSection>

      {/* ============ ACTIVITÉ PLATEFORME ============ */}
      <DashboardSection
        titre={t("platformActivity")}
        icone={Clock}
        className="mt-8"
      >
        {signalements !== null && paiements !== null ? (
          <ActiviteRecente
            evenements={activite}
            videTitre={t("noRecentActivity")}
            videDescription={t("noRecentActivityHint")}
          />
        ) : (
          <div role="status" aria-label={t("loadingPlatformActivity")}>
            <SkeletonListe nombre={3} />
          </div>
        )}
      </DashboardSection>
    </div>
  );
}
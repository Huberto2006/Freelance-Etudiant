"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  LayoutDashboard,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import {
  NoticeCard,
  StampBadge,
  StatCard,
} from "@/components/ui/Notice";
import {
  BarreMensuelle,
  AnneauRepartition,
  JaugeCirculaire,
} from "@/components/ui/Charts";
import { formatArgent } from "@/lib/format";

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

export default function TableauDeBordVueEnsemble() {
  const { utilisateur, chargement: chargementAuth } = useAuth();

  const [statsAdmin, setStatsAdmin] = useState<StatsAdmin | null>(null);
  const [statsEtudiant, setStatsEtudiant] =
    useState<StatsEtudiant | null>(null);

  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    // On attend que l'authentification soit terminée
    if (chargementAuth) {
      return;
    }

    // Aucun utilisateur connecté
    if (!utilisateur) {
      return;
    }

    let actif = true;

    async function chargerStatistiques() {
      setErreur(null);

      try {
        if (utilisateur?.role === "admin") {
          const data = await api.get<StatsAdmin>(
            "/statistiques/admin",
          );

          if (actif) {
            setStatsAdmin(data);
          }
        } else if (utilisateur?.role === "etudiant") {
          const data = await api.get<StatsEtudiant>(
            "/statistiques/etudiant/me",
          );

          if (actif) {
            setStatsEtudiant(data);
          }
        }
      } catch (error) {
        if (!actif) return;

        if (error instanceof ApiError) {
          setErreur(error.message);
        } else {
          setErreur(
            "Impossible de charger les statistiques.",
          );
        }
      } finally {
        if (actif) {
          setChargement(false);
        }
      }
    }

    // Le chargement démarre après l'exécution de l'effet
    // pour éviter le setState synchrone signalé par React.
    const timer = window.setTimeout(() => {
      if (!actif) return;

      setChargement(true);
      chargerStatistiques();
    }, 0);

    return () => {
      actif = false;
      window.clearTimeout(timer);
    };
  }, [utilisateur, chargementAuth]);

  // Authentification encore en cours
  if (chargementAuth) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-ink-soft">
          Chargement de votre compte…
        </p>
      </div>
    );
  }

  // Pas connecté
  if (!utilisateur) {
    return null;
  }

  return (
    <div>
      {/* En-tête */}
      <div className="mb-8 flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
          aria-hidden="true"
        >
          <LayoutDashboard size={20} />
        </span>

        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
            Tableau de bord
          </p>

          <h1 className="font-display text-3xl font-semibold">
            Bonjour, {utilisateur.nom.split(" ")[0]}
          </h1>
        </div>
      </div>

      {/* Profil étudiant */}
      {utilisateur?.role === "etudiant" &&
        utilisateur.profilEtudiant && (
          <NoticeCard className="mb-8 flex items-center gap-5">
            <StampBadge
              score={
                Number(
                  utilisateur.profilEtudiant.scoreReputation,
                ) || 0
              }
              size={72}
            />

            <div>
              <p className="font-display text-lg font-medium">
                Score de réputation
              </p>

              <p className="text-sm text-ink-soft">
                {
                  utilisateur.profilEtudiant
                    .nombreMissionsTerminees
                }{" "}
                projet(s) livré(s) · note moyenne{" "}
                {Number(
                  utilisateur.profilEtudiant.noteMoyenne,
                ).toFixed(1)}
                /5
              </p>
            </div>
          </NoticeCard>
        )}

      {/* Erreur */}
      {erreur && (
        <NoticeCard className="mb-6 border-brique/30">
          <p className="text-sm text-brique">{erreur}</p>
        </NoticeCard>
      )}

      {/* Chargement */}
      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement des statistiques…
        </p>
      ) : (
        <>
          {/* ========================= */}
          {/* STATISTIQUES ÉTUDIANT */}
          {/* ========================= */}

          {utilisateur?.role === "etudiant" &&
            statsEtudiant && (
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  icon={BriefcaseBusiness}
                  tone="ocre"
                  label="Missions en cours"
                  value={statsEtudiant.missionsEnCours}
                />

                <StatCard
                  icon={TrendingUp}
                  tone="rice"
                  label="Taux d'acceptation"
                  value={`${statsEtudiant.tauxAcceptationCandidatures}%`}
                />

                <StatCard
                  icon={Send}
                  tone="brique"
                  label="Candidatures envoyées"
                  value={statsEtudiant.totalCandidatures}
                />

                <BarreMensuelle
                  titre="Revenus mensuels"
                  sous_titre="Montant encaissé par mois, missions livrées"
                  donnees={statsEtudiant.revenusMensuels.map(
                    (m) => ({
                      mois: m.mois,
                      revenu: m.revenu,
                    }),
                  )}
                  cleValeur="revenu"
                  cleLabel="mois"
                  couleur="var(--color-ocre)"
                  formatValeur={(v) =>
                    `${Math.round(v / 1000)}k`
                  }
                />

                <NoticeCard className="sm:col-span-3 flex flex-col items-center justify-center gap-6 sm:flex-row sm:justify-between">
                  <JaugeCirculaire
                    valeur={
                      statsEtudiant.tauxAcceptationCandidatures
                    }
                    label={
                      <>
                        Taux d&apos;acceptation
                        <br />
                        de vos candidatures
                      </>
                    }
                    couleur="var(--color-rice)"
                  />

                  <div className="text-center sm:text-right">
                    <p className="font-display text-2xl">
                      {statsEtudiant.totalCandidatures}{" "}
                      candidature(s)
                    </p>

                    <p className="text-sm text-ink-soft">
                      envoyée(s) au total, pour{" "}
                      {statsEtudiant.missionsEnCours} mission(s)
                      {" "}en cours
                    </p>
                  </div>
                </NoticeCard>
              </div>
            )}

          {/* ========================= */}
          {/* STATISTIQUES ADMIN */}
          {/* ========================= */}

          {utilisateur?.role === "admin" && statsAdmin && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                icon={Users}
                tone="ocre"
                label="Utilisateurs inscrits"
                value={statsAdmin.nombreInscrits.total}
                sublabel={`${statsAdmin.nombreInscrits.etudiants} étudiants · ${statsAdmin.nombreInscrits.clients} clients`}
              />

              <StatCard
                icon={Banknote}
                tone="rice"
                label="Volume d'affaires"
                value={formatArgent(
                  statsAdmin.volumeAffairesGlobal,
                )}
              />

              <StatCard
                icon={CheckCircle2}
                tone="brique"
                label="Missions"
                value={`${statsAdmin.missions.terminees}/${statsAdmin.missions.total}`}
                sublabel="terminées"
              />

              <AnneauRepartition
                titre="Répartition des missions par catégorie"
                sous_titre="Part de chaque catégorie dans l'ensemble des missions publiées"
                donnees={statsAdmin.repartitionMissionsParCategorie.map(
                  (c) => ({
                    categorie: c.categorie,
                    total: c.total,
                  }),
                )}
                cleValeur="total"
                cleLabel="categorie"
              />

              <NoticeCard className="sm:col-span-3 flex flex-col items-center justify-center gap-6 sm:flex-row sm:justify-between">
                <JaugeCirculaire
                  valeur={
                    statsAdmin.missions.total > 0
                      ? (statsAdmin.missions.terminees /
                          statsAdmin.missions.total) *
                        100
                      : 0
                  }
                  label={
                    <>
                      Missions
                      <br />
                      terminées
                    </>
                  }
                  couleur="var(--color-brique)"
                />

                <div className="text-center sm:text-right">
                  <p className="font-display text-2xl">
                    {statsAdmin.missions.total} mission(s) au
                    total
                  </p>

                  <p className="text-sm text-ink-soft">
                    {statsAdmin.missions.terminees} livrée(s) sur
                    la plateforme
                  </p>
                </div>
              </NoticeCard>
            </div>
          )}

          {/* ========================= */}
          {/* CLIENT */}
          {/* ========================= */}

          {utilisateur?.role === "client" && (
            <NoticeCard className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rice/10 text-rice"
                aria-hidden="true"
              >
                <BriefcaseBusiness size={16} />
              </span>

              <p className="text-sm text-ink-soft">
                Retrouvez vos missions publiées et les
                candidatures reçues dans l&apos;onglet{" "}
                <strong>Mes missions</strong>.
              </p>
            </NoticeCard>
          )}

          {/* Aucun résultat */}
          {utilisateur?.role === "etudiant" &&
            !statsEtudiant &&
            !erreur && (
              <NoticeCard>
                <p className="text-sm text-ink-soft">
                  Aucune statistique disponible pour le moment.
                </p>
              </NoticeCard>
            )}

          {utilisateur?.role === "admin" &&
            !statsAdmin &&
            !erreur && (
              <NoticeCard>
                <p className="text-sm text-ink-soft">
                  Aucune statistique disponible pour le moment.
                </p>
              </NoticeCard>
            )}
        </>
      )}
    </div>
  );
}
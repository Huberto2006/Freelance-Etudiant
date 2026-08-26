"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  LayoutDashboard,
  Send,
  TrendingUp,
  Users,
  Wrench,
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
  const {
    utilisateur,
    chargement: chargementAuth,
  } = useAuth();

  const [statsAdmin, setStatsAdmin] =
    useState<StatsAdmin | null>(null);

  const [statsEtudiant, setStatsEtudiant] =
    useState<StatsEtudiant | null>(null);

  const [chargement, setChargement] =
    useState(false);

  const [erreur, setErreur] =
    useState<string | null>(null);

  // ==========================================================
  // CHARGEMENT DES STATISTIQUES
  // ==========================================================

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

  // ==========================================================
  // AUTHENTIFICATION EN COURS
  // ==========================================================

  if (chargementAuth) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-ink-soft">
          Chargement de votre compte…
        </p>
      </div>
    );
  }

  // ==========================================================
  // UTILISATEUR NON CONNECTÉ
  // ==========================================================

  if (!utilisateur) {
    return null;
  }

  return (
    <div>
      {/* ==================================================== */}
      {/* EN-TÊTE */}
      {/* ==================================================== */}

      <div className="mb-8 flex items-center gap-3">
        <span
          className="
            flex h-11 w-11 shrink-0
            items-center justify-center
            rounded-full bg-ocre/10 text-ocre-dark
          "
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

      {/* ==================================================== */}
      {/* ACCÈS RAPIDE */}
      {/* ==================================================== */}

      {utilisateur.role !== "admin" && (
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold">
              Accès rapide
            </h2>

            <p className="mt-1 text-sm text-ink-soft">
              Retrouvez rapidement les éléments importants
              de votre activité.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* ============================================== */}
            {/* ACCÈS RAPIDE ÉTUDIANT */}
            {/* ============================================== */}

            {utilisateur.role === "etudiant" && (
              <>
                {/* MES CANDIDATURES */}
                <Link
                  href="/tableau-de-bord/candidatures"
                  className="
                    group rounded-xl
                    border border-ink/10
                    bg-paper p-5
                    transition-all
                    hover:-translate-y-0.5
                    hover:border-ocre/30
                    hover:shadow-md
                  "
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="
                        flex h-11 w-11 shrink-0
                        items-center justify-center
                        rounded-full
                        bg-brique/10 text-brique
                      "
                    >
                      <Send size={20} />
                    </span>

                    <div>
                      <h3 className="font-medium text-ink">
                        Mes candidatures
                      </h3>

                      <p className="mt-1 text-sm text-ink-soft">
                        Suivez vos candidatures envoyées.
                      </p>
                    </div>
                  </div>
                </Link>

                {/* MES SERVICES */}
                <Link
                  href="/tableau-de-bord/mes-services"
                  className="
                    group rounded-xl
                    border border-ink/10
                    bg-paper p-5
                    transition-all
                    hover:-translate-y-0.5
                    hover:border-ocre/30
                    hover:shadow-md
                  "
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="
                        flex h-11 w-11 shrink-0
                        items-center justify-center
                        rounded-full
                        bg-ocre/10 text-ocre-dark
                      "
                    >
                      <Wrench size={20} />
                    </span>

                    <div>
                      <h3 className="font-medium text-ink">
                        Mes services
                      </h3>

                      <p className="mt-1 text-sm text-ink-soft">
                        Gérez les services que vous proposez.
                      </p>
                    </div>
                  </div>
                </Link>
              </>
            )}

            {/* ============================================== */}
            {/* ACCÈS RAPIDE CLIENT */}
            {/* ============================================== */}

            {utilisateur.role === "client" && (
              <Link
                href="/tableau-de-bord/mes-missions"
                className="
                  group rounded-xl
                  border border-ink/10
                  bg-paper p-5
                  transition-all
                  hover:-translate-y-0.5
                  hover:border-ocre/30
                  hover:shadow-md
                "
              >
                <div className="flex items-center gap-4">
                  <span
                    className="
                      flex h-11 w-11 shrink-0
                      items-center justify-center
                      rounded-full
                      bg-rice/10 text-rice
                    "
                  >
                    <BriefcaseBusiness size={20} />
                  </span>

                  <div>
                    <h3 className="font-medium text-ink">
                      Mes missions
                    </h3>

                    <p className="mt-1 text-sm text-ink-soft">
                      Gérez vos missions publiées et les
                      candidatures reçues.
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* ERREUR */}
      {/* ==================================================== */}

      {erreur && (
        <NoticeCard className="mb-6 border-brique/30">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* ==================================================== */}
      {/* CHARGEMENT */}
      {/* ==================================================== */}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement des statistiques…
        </p>
      ) : (
        <>
          {/* ================================================= */}
          {/* STATISTIQUES ÉTUDIANT */}
          {/* ================================================= */}

          {utilisateur.role === "etudiant" &&
            statsEtudiant && (
              <div className="grid gap-4 sm:grid-cols-3">

                {/* Missions en cours */}
                <StatCard
                  icon={BriefcaseBusiness}
                  tone="ocre"
                  label="Missions en cours"
                  value={statsEtudiant.missionsEnCours}
                  sublabel="Mission(s) actuellement active(s)"
                />

                {/* Taux d'acceptation */}
                <StatCard
                  icon={TrendingUp}
                  tone="rice"
                  label="Taux d'acceptation"
                  value={`${statsEtudiant.tauxAcceptationCandidatures}%`}
                  sublabel="De vos candidatures"
                />

                {/* Candidatures */}
                <StatCard
                  icon={Send}
                  tone="brique"
                  label="Candidatures envoyées"
                  value={statsEtudiant.totalCandidatures}
                  sublabel="Au total"
                />

                {/* Graphique revenus */}
                <div className="sm:col-span-2">
                  <BarreMensuelle
                    titre="Évolution de mes revenus"
                    sous_titre="Montants gagnés grâce aux missions livrées"
                    donnees={statsEtudiant.revenusMensuels}
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

                {/* Jauge acceptation */}
                <NoticeCard className="flex flex-col items-center justify-center p-6">
                  <JaugeCirculaire
                    valeur={
                      statsEtudiant.tauxAcceptationCandidatures
                    }
                    label={
                      <>
                        Taux d&apos;acceptation
                        <br />
                        des candidatures
                      </>
                    }
                    couleur="var(--color-rice)"
                  />

                  <p className="mt-4 text-center text-sm text-ink-soft">
                    Plus votre taux est élevé, plus votre
                    profil et vos candidatures sont efficaces.
                  </p>
                </NoticeCard>

                {/* Réputation */}
                <NoticeCard className="flex flex-col items-center justify-center gap-4 p-6 sm:col-span-1">
                  <StampBadge
                    score={
                      Number(
                        utilisateur.profilEtudiant?.scoreReputation,
                      ) || 0
                    }
                    size={90}
                  />

                  <div className="text-center">
                    <p className="font-display text-lg font-medium">
                      Votre réputation
                    </p>

                    <p className="text-sm text-ink-soft">
                      Basée sur vos missions et évaluations.
                    </p>
                  </div>
                </NoticeCard>

                {/* Résumé activité */}
                <NoticeCard className="flex flex-col justify-center gap-5 p-6 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-xl font-semibold">
                      Votre activité
                    </p>

                    <p className="mt-1 text-sm text-ink-soft">
                      Suivez l&apos;évolution de votre parcours
                      sur la plateforme.
                    </p>
                  </div>

                  <div className="flex gap-8 text-center">
                    <div>
                      <p className="font-display text-2xl font-semibold text-ocre-dark">
                        {utilisateur.profilEtudiant
                          ?.nombreMissionsTerminees || 0}
                      </p>

                      <p className="text-xs text-ink-soft">
                        Missions terminées
                      </p>
                    </div>

                    <div>
                      <p className="font-display text-2xl font-semibold text-ocre-dark">
                        {Number(
                          utilisateur.profilEtudiant?.noteMoyenne,
                        ).toFixed(1)}
                        /5
                      </p>

                      <p className="text-xs text-ink-soft">
                        Note moyenne
                      </p>
                    </div>

                    <div>
                      <p className="font-display text-2xl font-semibold text-ocre-dark">
                        {statsEtudiant.totalCandidatures}
                      </p>

                      <p className="text-xs text-ink-soft">
                        Candidatures
                      </p>
                    </div>
                  </div>
                </NoticeCard>
              </div>
            )}

          {/* ================================================= */}
          {/* STATISTIQUES ADMIN */}
          {/* ================================================= */}

          {utilisateur.role === "admin" &&
            statsAdmin && (
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

                <NoticeCard className="flex flex-col items-center justify-center gap-6 sm:col-span-3 sm:flex-row sm:justify-between">
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
                      {statsAdmin.missions.total} mission(s)
                      au total
                    </p>

                    <p className="text-sm text-ink-soft">
                      {statsAdmin.missions.terminees} livrée(s)
                      sur la plateforme
                    </p>
                  </div>
                </NoticeCard>
              </div>
            )}

          {/* ================================================= */}
          {/* AUCUNE STATISTIQUE */}
          {/* ================================================= */}

          {utilisateur.role === "etudiant" &&
            !statsEtudiant &&
            !erreur && (
              <NoticeCard>
                <p className="text-sm text-ink-soft">
                  Aucune statistique disponible pour le moment.
                </p>
              </NoticeCard>
            )}

          {utilisateur.role === "admin" &&
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
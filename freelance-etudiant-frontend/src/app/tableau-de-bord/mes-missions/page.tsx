"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BriefcaseBusiness, Loader2, MoreVertical, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { api, ApiError, getFileUrl } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Mission } from "@/types/missions";
import { SousNavigation } from "@/components/ui/SousNavigation";
import { cleCategorie } from "@/lib/categories";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useOptionLabels } from "@/i18n/use-option-labels";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { NoticeCard, PageHeader, StatCard, Tag } from "@/components/ui/Notice";
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";
import { dateLimiteDepassee } from "@/lib/format";
import { FormulaireMission } from "@/features/missions/components/FormulaireMission";
import { CandidaturesMission } from "@/features/missions/components/CandidaturesMission";

export default function MesMissionsPage() {
  const t = useTranslations("dashboardPages.myMissions");
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">{t("loading")}</p>}>
      <MesMissionsContent />
    </Suspense>
  );
}

function MesMissionsContent() {
  const t = useTranslations("dashboardPages.myMissions");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { statutMission } = useLabels();
  const { categorie: libelleCategorie } = useOptionLabels();
  const searchParams = useSearchParams();
  const idAEditer = searchParams.get("editer");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [missionEnEdition, setMissionEnEdition] = useState<Mission | null>(null);
  const [idAutoEditionFermee, setIdAutoEditionFermee] = useState<string | null>(
    null,
  );

  const [missionOuverte, setMissionOuverte] = useState<string | null>(null);

  // Sous-menu actif : Toutes / Ouvertes / En cours / Terminées / Expirées
  const [ongletMissions, setOngletMissions] = useState("toutes");

  // Recherche et filtre catégorie (au-dessus de la liste).
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");

  /**
   * Recharge les missions après une action.
   */
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const data = await api.get<Mission[]>("/missions/me/mes-missions");

      setMissions(data);
    } catch (error) {
      console.error("Erreur lors du chargement des missions :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : t("loadError"),
      );
    } finally {
      setChargement(false);
    }
  }, [t]);

  /**
   * Chargement initial.
   */
  useEffect(() => {
    let cancelled = false;

    const chargerInitial = async () => {
      try {
        const data = await api.get<Mission[]>("/missions/me/mes-missions");

        if (!cancelled) {
          setMissions(data);
          setErreur(null);
        }
      } catch (error) {
        console.error("Erreur lors du chargement initial :", error);

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    };

    chargerInitial();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const [missionASupprimer, setMissionASupprimer] = useState<Mission | null>(null);

  /**
   * Supprime une mission (refuse par le backend si elle est en cours,
   * terminee, ou a une candidature acceptee : voir MissionsService.remove).
   */
  const supprimer = async (mission: Mission) => {
    try {
      await api.delete(`/missions/${mission.id}`);
      setMissions((anciennes) => anciennes.filter((m) => m.id !== mission.id));
      if (missionEnEdition?.id === mission.id) setMissionEnEdition(null);
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("deleteError"),
      );
    }
  };

  // ==========================================================
  // CALCULS (aucun Hook ici)
  // ==========================================================

  const estExpiree = (mission: Mission) =>
    mission.statut === "expiree" ||
    (mission.statut === "ouverte" && dateLimiteDepassee(mission.dateLimite));

  const ouvertes = missions.filter(
    (m) => m.statut === "ouverte" && !estExpiree(m),
  ).length;
  const enCours = missions.filter((m) => m.statut === "en_cours").length;
  const terminees = missions.filter((m) => m.statut === "terminee").length;
  const expirees = missions.filter(estExpiree).length;

  const missionAutoAEditer =
    idAEditer && idAutoEditionFermee !== idAEditer
      ? missions.find((m) => m.id === idAEditer) ?? null
      : null;
  const missionEditee = missionEnEdition ?? missionAutoAEditer;

  function fermerEdition() {
    setMissionEnEdition(null);
    setAfficherFormulaire(false);
    if (idAEditer) setIdAutoEditionFermee(idAEditer);
  }

  const categoriesDisponibles = Array.from(
    new Map(
      missions
        .filter((m) => m.categorie)
        .map((m) => [cleCategorie(m.categorie), m.categorie]),
    ).values(),
  );

  const missionsFiltrees = missions.filter((mission) => {
    const texte = `${mission.titre} ${mission.categorie}`.toLowerCase();
    return (
      (!recherche.trim() || texte.includes(recherche.trim().toLowerCase())) &&
      (!filtreCategorie ||
        cleCategorie(mission.categorie) === cleCategorie(filtreCategorie))
    );
  });

  const missionsAffichees = missionsFiltrees.filter((mission) => {
    switch (ongletMissions) {
      case "ouvertes":
        return mission.statut === "ouverte" && !estExpiree(mission);
      case "en_cours":
        return mission.statut === "en_cours";
      case "terminees":
        return mission.statut === "terminee";
      case "expirees":
        return estExpiree(mission);
      default:
        return true;
    }
  });

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={BriefcaseBusiness}
          eyebrow={t("eyebrow")}
          title={t("title")}
          className="mb-0"
        />

        <Button
          variant="secondary"
          className="flex items-center justify-center gap-2"
          onClick={() => {
            fermerEdition();
            setAfficherFormulaire((v) => !v);
          }}
        >
          {afficherFormulaire ? (
            <>
              <X size={16} />
              {t("close")}
            </>
          ) : (
            <>
              <Plus size={16} />
              {t("publish")}
            </>
          )}
        </Button>
      </div>

      {/* =====================================================
          ERREUR GLOBALE
          ===================================================== */}

      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">{erreur}</p>
        </NoticeCard>
      )}

      {/* =====================================================
          CARTES STATISTIQUES
          ===================================================== */}

      {!chargement && missions.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => setOngletMissions("toutes")} className="cursor-pointer text-left">
            <StatCard icon={BriefcaseBusiness} tone="ink" label={t("stats.total")} value={missions.length} sublabel={t("stats.totalSub")} />
          </button>
          <button type="button" onClick={() => setOngletMissions("ouvertes")} className="cursor-pointer text-left">
            <StatCard icon={BriefcaseBusiness} tone="rice" label={t("stats.open")} value={ouvertes} sublabel={t("stats.openSub")} />
          </button>
          <button type="button" onClick={() => setOngletMissions("en_cours")} className="cursor-pointer text-left">
            <StatCard icon={BriefcaseBusiness} tone="ocre" label={t("stats.ongoing")} value={enCours} sublabel={t("stats.ongoingSub")} />
          </button>
          <button type="button" onClick={() => setOngletMissions("terminees")} className="cursor-pointer text-left">
            <StatCard icon={BriefcaseBusiness} tone="ink" label={t("stats.completed")} value={terminees} sublabel={t("stats.completedSub")} />
          </button>
        </div>
      )}

      {/* =====================================================
          FORMULAIRE DE CRÉATION
          ===================================================== */}

      {afficherFormulaire && !missionAutoAEditer && (
        <div className="mb-7">
          <FormulaireMission
            onCree={async () => {
              setAfficherFormulaire(false);
              await charger();
            }}
          />
        </div>
      )}

      {/* =====================================================
          FORMULAIRE D'ÉDITION
          ===================================================== */}

      {missionEditee && (
        <div className="mb-7">
          <FormulaireMission
            key={missionEditee.id}
            missionExistante={missionEditee}
            onCree={async () => {
              fermerEdition();
              await charger();
            }}
            onAnnuler={fermerEdition}
          />
        </div>
      )}

      {/* =====================================================
          CHARGEMENT
          ===================================================== */}

      {chargement ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {t("loadingMissions")}
        </p>
      ) : missions.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
              aria-hidden="true"
            >
              <BriefcaseBusiness size={22} />
            </span>
            <p className="text-sm text-ink-soft">
              {t("empty")}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setAfficherFormulaire(true)}
            >
              <Plus size={14} aria-hidden="true" />
              {t("publish")}
            </Button>
          </div>
        </NoticeCard>
      ) : (
        <>
          <SousNavigation
            onglets={[
              { valeur: "toutes", label: t("tabs.all"), compte: missions.length },
              { valeur: "ouvertes", label: t("tabs.open"), compte: ouvertes },
              { valeur: "en_cours", label: t("tabs.ongoing"), compte: enCours },
              { valeur: "terminees", label: t("tabs.completed"), compte: terminees },
              { valeur: "expirees", label: t("tabs.expired"), compte: expirees },
            ]}
            actif={ongletMissions}
            onChanger={setOngletMissions}
          />

          {/* Filtres de l'onglet courant */}
          {!chargement && missions.length > 0 && (
            <NoticeCard className="mb-6 mt-4 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
                  aria-hidden="true"
                />
                <Input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder={
                    ongletMissions === "ouvertes"
                      ? t("search.open")
                      : ongletMissions === "en_cours"
                        ? t("search.ongoing")
                        : ongletMissions === "terminees"
                          ? t("search.completed")
                          : ongletMissions === "expirees"
                            ? t("search.expired")
                            : t("search.all")
                  }
                  aria-label={t("search.label")}
                  className="pl-9"
                />
              </div>

              <Select
                value={filtreCategorie}
                onChange={(e) => setFiltreCategorie(e.target.value)}
                aria-label={t("filterCategory")}
              >
                <option value="" disabled hidden>{t("allCategories")}</option>
                {categoriesDisponibles.map((categorie) => (
                  <option key={categorie} value={categorie}>
                    {libelleCategorie(categorie)}
                  </option>
                ))}
              </Select>
            </NoticeCard>
          )}

          {missionsAffichees.length === 0 ? (
            <NoticeCard>
              <p className="text-sm text-ink-soft">
                {t("emptyCategory")}
              </p>
            </NoticeCard>
          ) : (
            <div className="flex flex-col gap-4">
              {missionsAffichees.map((mission) => {
                const image = getFileUrl(mission.imageUrl ?? null);

                return (
                  <NoticeCard key={mission.id} className="group">
                    <div className="flex flex-wrap items-start gap-4">
                      {/* VIGNETTE */}
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-paper sm:h-20 sm:w-28">
                        <ImageAvecRepli
                          src={image}
                          alt=""
                          categorie={mission.categorie}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          tailleIcone={22}
                        />
                      </div>

                      <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Tag
                              tone={
                                estExpiree(mission) ? "brique" : "rice"
                              }
                            >
                              {statutMission(mission.statut)}
                            </Tag>

                            <Tag tone="ink">{libelleCategorie(mission.categorie)}</Tag>
                          </div>

                          <p className="font-display text-lg font-medium transition-colors group-hover:text-ocre-dark">
                            {mission.titre}
                          </p>

                          <p className="mt-1 text-xs text-ink-soft/70">
                            {t("meta", {
                              count: mission.candidatures?.length ?? 0,
                              budget: formatArgent(mission.budget),
                              date: formatDateCourte(mission.dateLimite),
                            })}
                            {estExpiree(mission) &&
                            mission.statut === "ouverte"
                              ? t("overdue")
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Menu des actions principales */}
                          <details className="relative">
                            <summary
                              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink [&::-webkit-details-marker]:hidden"
                              aria-label={t("actionsFor", { titre: mission.titre })}
                            >
                              <MoreVertical size={19} />
                            </summary>

                            <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-ink/10 bg-paper p-1.5 shadow-lg">
                              <Link
                                href={`/missions/${mission.id}`}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ink/5"
                              >
                                <Search size={15} />
                                {t("view")}
                              </Link>

                              <button
                                type="button"
                                onClick={() => {
                                  setAfficherFormulaire(false);
                                  setMissionEnEdition(mission);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-ink/5"
                              >
                                <Pencil size={15} />
                                {t("edit")}
                              </button>

                              {mission.statut !== "en_cours" &&
                                mission.statut !== "terminee" && (
                                  <button
                                    type="button"
                                    onClick={() => setMissionASupprimer(mission)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brique transition hover:bg-brique/5"
                                  >
                                    <Trash2 size={15} />
                                    {t("delete")}
                                  </button>
                                )}
                            </div>
                          </details>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setMissionOuverte(
                                missionOuverte === mission.id
                                  ? null
                                  : mission.id,
                              )
                            }
                          >
                            {missionOuverte === mission.id
                              ? t("hideApplications")
                              : t("applicationsCount", {
                                  count: mission.candidatures?.length ?? 0,
                                })}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* =============================================
                        CANDIDATURES
                        ============================================= */}

                    {missionOuverte === mission.id && (
                      <div className="mt-5 border-t border-ink/15 pt-5">
                        <CandidaturesMission
                          missionId={mission.id}
                          onCandidatureAcceptee={charger}
                        />
                      </div>
                    )}
                  </NoticeCard>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        ouvert={missionASupprimer !== null}
        titre={t("confirmDeleteTitle")}
        description={
          missionASupprimer
            ? t("confirmDeleteDescription", { titre: missionASupprimer.titre })
            : undefined
        }
        libelleConfirmer={t("delete")}
        onConfirmer={() => {
          if (missionASupprimer) void supprimer(missionASupprimer);
          setMissionASupprimer(null);
        }}
        onAnnuler={() => setMissionASupprimer(null)}
      />
    </div>
  );
}

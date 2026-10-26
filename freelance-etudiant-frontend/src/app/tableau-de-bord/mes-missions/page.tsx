"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BriefcaseBusiness, Check, Loader2, MoreVertical, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { api, ApiError, getFileUrl } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Candidature, Mission } from "@/lib/types";
import { SousNavigation } from "@/components/ui/SousNavigation";
import { CATEGORIE_AUTRE, cleCategorie } from "@/lib/categories";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useOptionLabels } from "@/i18n/use-option-labels";



import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { MultiSelectCreatable } from "@/components/ui/MultiSelectCreatable";
import { NoticeCard, PageHeader, StampBadge, StatCard, Tag } from "@/components/ui/Notice";
import { SelecteurImage } from "@/components/ui/SelecteurImage";
import { ImageAvecRepli } from "@/components/ui/ImageAvecRepli";
import { dateLimiteDepassee } from "@/lib/format";
import { COMPETENCES_PREDEFINIES } from "@/data/field-options";

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

/* =========================================================
   FORMULAIRE DE CRÉATION D'UNE MISSION
   ========================================================= */

function FormulaireMission({
  missionExistante,
  onCree,
  onAnnuler,
}: {
  missionExistante?: Mission;
  onCree: () => void | Promise<void>;
  onAnnuler?: () => void;
}) {
  const t = useTranslations("dashboardPages.myMissions.form");
  const { optionsCategories } = useOptionLabels();
  const enEdition = Boolean(missionExistante);

  const [titre, setTitre] = useState(missionExistante?.titre ?? "");
  const [description, setDescription] = useState(missionExistante?.description ?? "");
  const categorieInitiale = missionExistante?.categorie ?? "";
  // optionsCategories(categorieInitiale) ajoute la categorie existante a la
  // liste si elle n'est pas dans le referentiel : elle reste donc toujours
  // selectionnable telle quelle (pas de bascule forcee vers "Autre").
  const [categorie, setCategorie] = useState(categorieInitiale);
  const [categoriePersonnalisee, setCategoriePersonnalisee] = useState("");
  const [budget, setBudget] = useState(
    missionExistante ? String(missionExistante.budget) : "",
  );
  // Date limite d'origine (pour ne l'envoyer au backend que si elle change :
  // une mission dont l'echeance approche ou est passee doit rester
  // modifiable pour tout le reste — voir MissionsService.update).
  const dateLimiteInitiale = missionExistante
    ? missionExistante.dateLimite.slice(0, 10)
    : "";
  const [dateLimite, setDateLimite] = useState(dateLimiteInitiale);
  const [competencesRequises, setCompetencesRequises] = useState(
    missionExistante?.competencesRequises.join(", ") ?? "",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    missionExistante?.imageUrl ?? null,
  );
  const [imageModifiee, setImageModifiee] = useState(false);

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErreur(null);
    setEnvoi(true);

    try {
      const categorieFinale =
        categorie === CATEGORIE_AUTRE
          ? categoriePersonnalisee.trim()
          : categorie;

      const payload = {
        titre: titre.trim(),
        description: description.trim(),
        categorie: categorieFinale,
        budget: Number(budget),
        // N'envoie la date limite que si elle a change : elle reste
        // sinon simplement absente du PATCH, et la mission garde son
        // echeance meme si elle est proche ou passee.
        ...(dateLimite !== dateLimiteInitiale ? { dateLimite } : {}),
        // On n'envoie imageUrl que si elle a réellement été modifiée :
        // le PATCH backend ne modifie que les champs présents dans le
        // payload, donc omettre ce champ conserve l'image actuelle.
        // On envoie explicitement `null` (et non `undefined`, qui serait
        // supprimé par JSON.stringify) pour permettre de retirer l'image.
        ...(imageModifiee ? { imageUrl } : {}),

        competencesRequises: competencesRequises
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      };

      if (enEdition && missionExistante) {
        await api.patch(`/missions/${missionExistante.id}`, payload);
      } else {
        await api.post("/missions", payload);
      }

      await onCree();
    } catch (err) {
      console.error("Erreur lors de la création de la mission :", err);

      setErreur(err instanceof ApiError ? err.message : t("unexpectedError"));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <h2 className="font-display text-xl font-semibold">
        {enEdition ? t("editTitle") : t("newTitle")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {enEdition
          ? t("editHint")
          : t("newHint")}
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
        {/* — 01 · VISUEL */}

        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionVisual")}
        </p>

        <div className="grid items-start gap-4 sm:grid-cols-[auto,1fr]">
          <Field label={t("mainImage")} htmlFor="imageMission">
            <SelecteurImage
              valeur={imageUrl}
              onChange={(url) => {
                setImageUrl(url);
                setImageModifiee(true);
              }}
              disabled={envoi}
            />
          </Field>

          <ul className="grid gap-2 self-center text-xs text-ink-soft/80">
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              {t("tipImageOptional")}
            </li>
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              {t("tipImageBright")}
            </li>
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              {t("tipRealistic")}
            </li>
          </ul>
        </div>

        {/* — 02 · CONTENU */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionContent")}
        </p>

        {/* Titre */}

        <Field label={t("titleLabel")} htmlFor="titre">
          <Input
            id="titre"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder={t("titlePlaceholder")}
            disabled={envoi}
          />
        </Field>

        {/* Description */}

        <Field label={t("descriptionLabel")} htmlFor="description">
          <Textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            disabled={envoi}
          />
        </Field>

        {/* — 03 · PARAMÈTRES */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionSettings")}
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label={t("categoryLabel")} htmlFor="categorie">
            <Select
              id="categorie"
              required
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              disabled={envoi}
            >
              <option value="" disabled hidden>{t("selectCategory")}</option>
              {optionsCategories(categorieInitiale).map((option) => (
                <option key={option.valeur} value={option.valeur}>
                  {option.libelle}
                </option>
              ))}
            </Select>
            {categorie === CATEGORIE_AUTRE && (
              <Input
                className="mt-2"
                value={categoriePersonnalisee}
                onChange={(e) => setCategoriePersonnalisee(e.target.value)}
                placeholder={t("customCategory")}
                required
                disabled={envoi}
              />
            )}
          </Field>

          <Field label={t("budgetLabel")} htmlFor="budget">
            <Input
              id="budget"
              type="number"
              min={0}
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={envoi}
            />
          </Field>

          <Field label={t("deadlineLabel")} htmlFor="dateLimite">
            <Input
              id="dateLimite"
              type="date"
              required
              value={dateLimite}
              onChange={(e) => setDateLimite(e.target.value)}
              disabled={envoi}
            />
          </Field>
        </div>

        {/* — 04 · COMPÉTENCES */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-soft/70">
          {t("sectionSkills")}
        </p>

        <Field
          label={t("requiredSkills")}
          htmlFor="competencesRequises"
          hint={t("skillsHint")}
        >
          <MultiSelectCreatable
            id="competencesRequises"
            value={competencesRequises}
            onChange={setCompetencesRequises}
            options={COMPETENCES_PREDEFINIES}
            placeholder={t("skillsSearch")}
            allowCreate
            disabled={envoi}
          />
        </Field>

        {/* Erreur */}

        {erreur && <p className="text-sm text-brique">{erreur}</p>}

        {/* — ACTIONS */}

        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-5">
          <p className="mr-auto text-xs text-ink-soft/60">
            {t("optionalNote")}
          </p>

          {enEdition && onAnnuler && (
            <Button
              type="button"
              variant="ghost"
              disabled={envoi}
              onClick={onAnnuler}
            >
              {t("cancel")}
            </Button>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={envoi}
            className="gap-2"
          >
            {envoi && (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            )}
            {envoi
              ? enEdition
                ? t("saving")
                : t("publishing")
              : enEdition
                ? t("saveChanges")
                : t("publishMission")}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}

/* =========================================================
   CANDIDATURES D'UNE MISSION
   ========================================================= */

function CandidaturesMission({
  missionId,
  onCandidatureAcceptee,
}: {
  missionId: string;
  onCandidatureAcceptee?: () => void | Promise<void>;
}) {
  const t = useTranslations("dashboardPages.myMissions.applications");
  const { argent: formatArgent } = useFormats();
  const { statutCandidature } = useLabels();
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Identifiant de la candidature en cours de traitement (acceptation ou
   * refus). Protege contre le double-clic : les deux boutons d'une
   * candidature sont desactives pendant l'appel, et les autres
   * candidatures restent utilisables.
   */
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  /**
   * Recharge les candidatures.
   */
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const data = await api.get<Candidature[]>(
        `/missions/${missionId}/candidatures`,
      );

      setCandidatures(data);
    } catch (error) {
      console.error("Erreur lors du chargement des candidatures :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : t("loadError"),
      );
    } finally {
      setChargement(false);
    }
  }, [missionId, t]);

  /**
   * Chargement initial.
   */
  useEffect(() => {
    let cancelled = false;

    const chargerInitial = async () => {
      try {
        const data = await api.get<Candidature[]>(
          `/missions/${missionId}/candidatures`,
        );

        if (!cancelled) {
          setCandidatures(data);
          setErreur(null);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement initial des candidatures :",
          error,
        );

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
  }, [missionId, t]);

  /**
   * Accepter une candidature.
   */
  async function accepter(id: string) {
    if (actionEnCours) return; // anti double-clic
    setActionEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/candidatures/${id}/accepter`);

      await charger();
      // La mission passe a EN_COURS cote backend : on rafraichit la liste
      // des missions du parent pour que son statut affiche ne reste pas
      // "Ouverte" jusqu'au prochain rechargement de page.
      await onCandidatureAcceptee?.();
    } catch (error) {
      console.error("Erreur lors de l'acceptation :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : t("acceptError"),
      );
    } finally {
      setActionEnCours(null);
    }
  }

  /**
   * Refuser une candidature.
   */
  async function refuser(id: string) {
    if (actionEnCours) return; // anti double-clic
    setActionEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/candidatures/${id}/refuser`);

      await charger();
    } catch (error) {
      console.error("Erreur lors du refus :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : t("refuseError"),
      );
    } finally {
      setActionEnCours(null);
    }
  }

  if (chargement) {
    return <p className="text-sm text-ink-soft">{t("loading")}</p>;
  }

  if (erreur) {
    return <p className="text-sm text-brique">{erreur}</p>;
  }

  if (candidatures.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        {t("none")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {candidatures.map((candidature) => {
        const etudiant = candidature.etudiant?.utilisateur;

        return (
          <div
            key={candidature.id}
            className="border border-ink/15 bg-paper/60 p-4"
          >
            {/* =================================================
                INFORMATIONS ÉTUDIANT
                ================================================= */}

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {candidature.etudiant && (
                  <StampBadge
                    score={Number(candidature.etudiant.scoreReputation) || 0}
                    size={44}
                  />
                )}

                <div>
                  <p className="font-display flex items-center gap-1.5 font-medium">
                    {etudiant?.nom ?? t("studentFallback")}
                    {candidature.groupeId && (
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[0.65rem] font-normal text-ink-soft">
                        {candidature.groupe?.nom
                          ? t("groupNamed", { nom: candidature.groupe.nom })
                          : t("group")}
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-ink-soft/70">
                    {formatArgent(candidature.prixPropose)}
                    {" · "}
                    {t("days", { count: candidature.delaiPropose })}
                    {candidature.groupeId && candidature.groupe?.membres && (
                      <>
                        {" · "}
                        {t("members", { count: candidature.groupe.membres.length })}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <Tag
                tone={
                  candidature.statut === "acceptee"
                    ? "rice"
                    : candidature.statut === "refusee"
                      ? "brique"
                      : "ink"
                }
              >
                {statutCandidature(candidature.statut)}
              </Tag>
            </div>

            {/* =================================================
                MESSAGE DE CANDIDATURE
                ================================================= */}

            {candidature.message && (
              <p className="mt-3 text-sm text-ink-soft">
                {candidature.message}
              </p>
            )}

            {/* =================================================
                ACTIONS EN ATTENTE
                ================================================= */}

            {candidature.statut === "en_attente" && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={actionEnCours !== null}
                  onClick={() => accepter(candidature.id)}
                >
                  {actionEnCours === candidature.id
                    ? t("accepting")
                    : t("accept")}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionEnCours !== null}
                  onClick={() => refuser(candidature.id)}
                >
                  {actionEnCours === candidature.id
                    ? t("refusing")
                    : t("refuse")}
                </Button>
              </div>
            )}

            {/* =================================================
                CANDIDATURE ACCEPTÉE
                ================================================= */}

            {candidature.statut === "acceptee" && (
              <div className="mt-4 border-t border-ink/10 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {/* -----------------------------------------
                      MESSAGERIE
                      ----------------------------------------- */}

                  {etudiant && (
                    <Link
                      href={`/tableau-de-bord/messages?contact=${encodeURIComponent(
                        etudiant.id,
                      )}&nom=${encodeURIComponent(etudiant.nom)}`}
                    >
                      <Button size="sm" variant="secondary">
                        {t("chatWithStudent")}
                      </Button>
                    </Link>
                  )}

                  {/* -----------------------------------------
                      LIVRAISON
                      ----------------------------------------- */}

                  <Link
                    href={`/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
                      candidature.id,
                    )}&role=client`}
                  >
                    <Button size="sm" variant="ghost">
                      {t("trackDelivery")}
                    </Button>
                  </Link>
                </div>

                <p className="mt-2 text-xs text-ink-soft/70">
                  {t("deliveryHint")}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

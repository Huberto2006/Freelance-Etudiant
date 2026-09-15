"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Check, Loader2, MoreVertical, Pencil, Plus, Search, X } from "lucide-react";

import { api, ApiError, getFileUrl } from "@/lib/api";
import type { Candidature, Mission } from "@/lib/types";
import { SousNavigation } from "@/components/ui/SousNavigation";
import { iconePourCategorie } from "@/lib/categories";

import {
  formatArgent,
  formatDateCourte,
  statutCandidatureLabel,
  statutMissionLabel,
} from "@/lib/format";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NoticeCard, PageHeader, StampBadge, StatCard, Tag } from "@/components/ui/Notice";
import { SelecteurImage } from "@/components/ui/SelecteurImage";

export default function MesMissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [missionEnEdition, setMissionEnEdition] = useState<Mission | null>(null);

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
          : "Impossible de charger vos missions.",
      );
    } finally {
      setChargement(false);
    }
  }, []);

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
              : "Impossible de charger vos missions.",
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
  }, []);

  // ==========================================================
  // CALCULS (aucun Hook ici)
  // ==========================================================

  const estExpiree = (mission: Mission) =>
    mission.statut === "expiree" ||
    (mission.statut === "ouverte" &&
      new Date(mission.dateLimite) < new Date());

  const ouvertes = missions.filter(
    (m) => m.statut === "ouverte" && !estExpiree(m),
  ).length;
  const enCours = missions.filter((m) => m.statut === "en_cours").length;
  const terminees = missions.filter((m) => m.statut === "terminee").length;
  const expirees = missions.filter(estExpiree).length;

  const categoriesDisponibles = Array.from(
    new Set(missions.map((m) => m.categorie).filter(Boolean)),
  );

  const missionsFiltrees = missions.filter((mission) => {
    const texte = `${mission.titre} ${mission.categorie}`.toLowerCase();
    return (
      (!recherche.trim() || texte.includes(recherche.trim().toLowerCase())) &&
      (!filtreCategorie || mission.categorie === filtreCategorie)
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          icon={BriefcaseBusiness}
          eyebrow="Espace client"
          title="Mes missions"
          className="mb-0"
        />

        <Button
          variant="secondary"
          className="flex items-center justify-center gap-2"
          onClick={() => {
            setMissionEnEdition(null);
            setAfficherFormulaire((v) => !v);
          }}
        >
          {afficherFormulaire ? (
            <>
              <X size={16} />
              Fermer
            </>
          ) : (
            <>
              <Plus size={16} />
              Publier une mission
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
            <StatCard icon={BriefcaseBusiness} tone="ink" label="Total" value={missions.length} sublabel="Missions publiées" />
          </button>
          <button type="button" onClick={() => setOngletMissions("ouvertes")} className="cursor-pointer text-left">
            <StatCard icon={BriefcaseBusiness} tone="rice" label="Ouvertes" value={ouvertes} sublabel="En attente de candidats" />
          </button>
          <button type="button" onClick={() => setOngletMissions("en_cours")} className="cursor-pointer text-left">
            <StatCard icon={BriefcaseBusiness} tone="ocre" label="En cours" value={enCours} sublabel="Avec un étudiant" />
          </button>
          <button type="button" onClick={() => setOngletMissions("terminees")} className="cursor-pointer text-left">
            <StatCard icon={BriefcaseBusiness} tone="ink" label="Terminées" value={terminees} sublabel="Projets livrés" />
          </button>
        </div>
      )}

      {/* =====================================================
          FORMULAIRE DE CRÉATION
          ===================================================== */}

      {afficherFormulaire && (
        <div className="mb-8">
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

      {missionEnEdition && (
        <div className="mb-8">
          <FormulaireMission
            key={missionEnEdition.id}
            missionExistante={missionEnEdition}
            onCree={async () => {
              setMissionEnEdition(null);
              await charger();
            }}
            onAnnuler={() => setMissionEnEdition(null)}
          />
        </div>
      )}

      {/* =====================================================
          CHARGEMENT
          ===================================================== */}

      {chargement ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Chargement de vos missions…
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
              Vous n&apos;avez pas encore publié de mission.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setAfficherFormulaire(true)}
            >
              <Plus size={14} aria-hidden="true" />
              Publier une mission
            </Button>
          </div>
        </NoticeCard>
      ) : (
        <>
          <SousNavigation
            onglets={[
              { valeur: "toutes", label: "Toutes", compte: missions.length },
              { valeur: "ouvertes", label: "Ouvertes", compte: ouvertes },
              { valeur: "en_cours", label: "En cours", compte: enCours },
              { valeur: "terminees", label: "Terminées", compte: terminees },
              { valeur: "expirees", label: "Expirées", compte: expirees },
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
                      ? "Rechercher une mission ouverte…"
                      : ongletMissions === "en_cours"
                        ? "Rechercher une mission en cours…"
                        : ongletMissions === "terminees"
                          ? "Rechercher une mission terminée…"
                          : ongletMissions === "expirees"
                            ? "Rechercher une mission expirée…"
                            : "Rechercher une mission…"
                  }
                  aria-label="Rechercher une mission"
                  className="pl-9"
                />
              </div>

              <Select
                value={filtreCategorie}
                onChange={(e) => setFiltreCategorie(e.target.value)}
                aria-label="Filtrer par catégorie"
              >
                <option value="">Toutes les catégories</option>
                {categoriesDisponibles.map((categorie) => (
                  <option key={categorie} value={categorie}>
                    {categorie}
                  </option>
                ))}
              </Select>
            </NoticeCard>
          )}

          {missionsAffichees.length === 0 ? (
            <NoticeCard>
              <p className="text-sm text-ink-soft">
                Aucune mission dans cette catégorie.
              </p>
            </NoticeCard>
          ) : (
            <div className="flex flex-col gap-4">
              {missionsAffichees.map((mission) => {
                const image = getFileUrl(mission.imageUrl ?? null);
                const IconeCategorie = iconePourCategorie(mission.categorie);

                return (
                  <NoticeCard key={mission.id} className="group">
                    <div className="flex flex-wrap items-start gap-4">
                      {/* VIGNETTE */}
                      <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-paper sm:block">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <IconeCategorie size={22} className="text-ocre-dark/50" aria-hidden="true" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Tag
                              tone={
                                estExpiree(mission) ? "brique" : "rice"
                              }
                            >
                              {statutMissionLabel[mission.statut]}
                            </Tag>

                            <Tag tone="ink">{mission.categorie}</Tag>
                          </div>

                          <p className="font-display text-lg font-medium transition-colors group-hover:text-ocre-dark">
                            {mission.titre}
                          </p>

                          <p className="mt-1 text-xs text-ink-soft/70">
                            {mission.candidatures?.length ?? 0} candidature(s)
                            reçue(s)
                            {" · "}
                            budget {formatArgent(mission.budget)}
                            {" · "}
                            avant le {formatDateCourte(mission.dateLimite)}
                            {estExpiree(mission) &&
                            mission.statut === "ouverte"
                              ? " (échéance dépassée)"
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Menu des actions principales */}
                          <details className="relative">
                            <summary
                              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink [&::-webkit-details-marker]:hidden"
                              aria-label={`Actions pour ${mission.titre}`}
                            >
                              <MoreVertical size={19} />
                            </summary>

                            <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-ink/10 bg-paper p-1.5 shadow-lg">
                              <Link
                                href={`/missions/${mission.id}`}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-ink/5"
                              >
                                <Search size={15} />
                                Voir
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
                                Modifier
                              </button>
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
                              ? "Masquer les candidatures"
                              : `Candidatures (${
                                  mission.candidatures?.length ?? 0
                                })`}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* =============================================
                        CANDIDATURES
                        ============================================= */}

                    {missionOuverte === mission.id && (
                      <div className="mt-5 border-t border-ink/15 pt-5">
                        <CandidaturesMission missionId={mission.id} />
                      </div>
                    )}
                  </NoticeCard>
                );
              })}
            </div>
          )}
        </>
      )}
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
  const enEdition = Boolean(missionExistante);

  const [titre, setTitre] = useState(missionExistante?.titre ?? "");
  const [description, setDescription] = useState(missionExistante?.description ?? "");
  const [categorie, setCategorie] = useState(missionExistante?.categorie ?? "");
  const [budget, setBudget] = useState(
    missionExistante ? String(missionExistante.budget) : "",
  );
  const [dateLimite, setDateLimite] = useState(
    missionExistante ? missionExistante.dateLimite.slice(0, 10) : "",
  );
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
      const payload = {
        titre: titre.trim(),
        description: description.trim(),
        categorie: categorie.trim(),
        budget: Number(budget),
        dateLimite,
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

      setErreur(err instanceof ApiError ? err.message : "Erreur inattendue.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <h2 className="font-display text-xl font-semibold">
        {enEdition ? "Modifier la mission" : "Nouvelle mission"}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {enEdition
          ? "Les modifications sont visibles immédiatement après enregistrement."
          : "Votre annonce sera visible dans le catalogue des missions dès sa publication."}
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-5">
        {/* — 01 · VISUEL */}

        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft/70">
          01 · Visuel
        </p>

        <div className="grid items-start gap-4 sm:grid-cols-[auto,1fr]">
          <Field label="Image principale" htmlFor="imageMission">
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
              L&apos;image est facultative : sans elle, un visuel de catégorie
              est affiché automatiquement.
            </li>
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              Une image claire et lumineuse attire davantage de candidatures.
            </li>
            <li className="flex items-start gap-2">
              <Check
                size={12}
                className="mt-0.5 shrink-0 text-rice"
                aria-hidden="true"
              />
              Indiquez un budget et une échéance réalistes pour inspirer
              confiance.
            </li>
          </ul>
        </div>

        {/* — 02 · CONTENU */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft/70">
          02 · Contenu
        </p>

        {/* Titre */}

        <Field label="Titre" htmlFor="titre">
          <Input
            id="titre"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Développement d'un site vitrine"
            disabled={envoi}
          />
        </Field>

        {/* Description */}

        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez le contexte, les livrables attendus et vos contraintes…"
            disabled={envoi}
          />
        </Field>

        {/* — 03 · PARAMÈTRES */}

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft/70">
          03 · Paramètres
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Catégorie" htmlFor="categorie">
            <Input
              id="categorie"
              required
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              placeholder="Développement"
              disabled={envoi}
            />
          </Field>

          <Field label="Budget (Ar)" htmlFor="budget">
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

          <Field label="Date limite" htmlFor="dateLimite">
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

        <p className="mt-2 border-t border-ink/10 pt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-soft/70">
          04 · Compétences
        </p>

        <Field
          label="Compétences requises"
          htmlFor="competencesRequises"
          hint="Séparées par des virgules"
        >
          <Input
            id="competencesRequises"
            value={competencesRequises}
            onChange={(e) => setCompetencesRequises(e.target.value)}
            placeholder="Next.js, NestJS, PostgreSQL"
            disabled={envoi}
          />
        </Field>

        {/* Erreur */}

        {erreur && <p className="text-sm text-brique">{erreur}</p>}

        {/* — ACTIONS */}

        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-5">
          <p className="mr-auto text-xs text-ink-soft/60">
            L&apos;image et les compétences sont facultatives.
          </p>

          {enEdition && onAnnuler && (
            <Button
              type="button"
              variant="ghost"
              disabled={envoi}
              onClick={onAnnuler}
            >
              Annuler
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
                ? "Enregistrement…"
                : "Publication…"
              : enEdition
                ? "Enregistrer les modifications"
                : "Publier la mission"}
          </Button>
        </div>
      </form>
    </NoticeCard>
  );
}

/* =========================================================
   CANDIDATURES D'UNE MISSION
   ========================================================= */

function CandidaturesMission({ missionId }: { missionId: string }) {
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
          : "Impossible de charger les candidatures.",
      );
    } finally {
      setChargement(false);
    }
  }, [missionId]);

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
              : "Impossible de charger les candidatures.",
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
  }, [missionId]);

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
    } catch (error) {
      console.error("Erreur lors de l'acceptation :", error);

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'accepter cette candidature.",
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
          : "Impossible de refuser cette candidature.",
      );
    } finally {
      setActionEnCours(null);
    }
  }

  if (chargement) {
    return <p className="text-sm text-ink-soft">Chargement…</p>;
  }

  if (erreur) {
    return <p className="text-sm text-brique">{erreur}</p>;
  }

  if (candidatures.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Aucune candidature reçue pour l&apos;instant.
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
                  <p className="font-display font-medium">
                    {etudiant?.nom ?? "Étudiant"}
                  </p>

                  <p className="text-xs text-ink-soft/70">
                    {formatArgent(candidature.prixPropose)}
                    {" · "}
                    {candidature.delaiPropose} jours
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
                {statutCandidatureLabel[candidature.statut]}
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
                    ? "Acceptation…"
                    : "Accepter"}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionEnCours !== null}
                  onClick={() => refuser(candidature.id)}
                >
                  {actionEnCours === candidature.id
                    ? "Refus…"
                    : "Refuser"}
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
                        Discuter avec l&apos;étudiant
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
                      Suivre la livraison
                    </Button>
                  </Link>
                </div>

                <p className="mt-2 text-xs text-ink-soft/70">
                  La validation et l&apos;évaluation de la livraison se font
                  depuis la page dédiée aux livraisons.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

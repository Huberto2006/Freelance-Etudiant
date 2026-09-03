"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Pencil, Plus, X } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Candidature, Mission } from "@/lib/types";

import {
  formatArgent,
  statutCandidatureLabel,
  statutMissionLabel,
} from "@/lib/format";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { NoticeCard, StampBadge, Tag } from "@/components/ui/Notice";
import { SelecteurImage } from "@/components/ui/SelecteurImage";

export default function MesMissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [missionEnEdition, setMissionEnEdition] = useState<Mission | null>(null);

  const [missionOuverte, setMissionOuverte] = useState<string | null>(null);

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

  return (
    <div>
      {/* =====================================================
          EN-TÊTE
          ===================================================== */}

      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark"
            aria-hidden="true"
          >
            <BriefcaseBusiness size={20} />
          </span>

          <h1 className="font-display text-3xl font-semibold">Mes missions</h1>
        </div>

        <Button
          variant="secondary"
          className="gap-2"
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
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : missions.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Vous n&apos;avez pas encore publié de mission.
          </p>
        </NoticeCard>
      ) : (
        <div className="flex flex-col gap-4">
          {missions.map((mission) => (
            <NoticeCard key={mission.id}>
              {/* =================================================
                  INFORMATIONS MISSION
                  ================================================= */}

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Tag tone="rice">{statutMissionLabel[mission.statut]}</Tag>

                    <Tag tone="ink">{mission.categorie}</Tag>
                  </div>

                  <p className="font-display text-lg font-medium">
                    {mission.titre}
                  </p>

                  <p className="mt-1 text-xs text-ink-soft/70">
                    {mission.candidatures?.length ?? 0} candidature(s) reçue(s)
                    {" · "}
                    budget {formatArgent(mission.budget)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => {
                      setAfficherFormulaire(false);
                      setMissionEnEdition(mission);
                    }}
                  >
                    <Pencil size={13} />
                    Modifier
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setMissionOuverte(
                        missionOuverte === mission.id ? null : mission.id,
                      )
                    }
                  >
                    {missionOuverte === mission.id
                      ? "Masquer les candidatures"
                      : "Voir les candidatures"}
                  </Button>
                </div>
              </div>

              {/* =================================================
                  CANDIDATURES
                  ================================================= */}

              {missionOuverte === mission.id && (
                <div className="mt-5 border-t border-ink/15 pt-5">
                  <CandidaturesMission missionId={mission.id} />
                </div>
              )}
            </NoticeCard>
          ))}
        </div>
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
      <h2 className="mb-4 font-display text-xl font-semibold">
        {enEdition ? "Modifier la mission" : "Nouvelle mission"}
      </h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {/* Image principale */}

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
            disabled={envoi}
          />
        </Field>

        {/* Catégorie / Budget / Date */}

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

        {/* Compétences */}

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

        {/* Bouton */}

        <div className="flex gap-2">
          <Button type="submit" disabled={envoi} className="self-start">
            {envoi
              ? enEdition
                ? "Enregistrement…"
                : "Publication…"
              : enEdition
                ? "Enregistrer les modifications"
                : "Publier"}
          </Button>
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
    }
  }

  /**
   * Refuser une candidature.
   */
  async function refuser(id: string) {
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
                <Button size="sm" onClick={() => accepter(candidature.id)}>
                  Accepter
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refuser(candidature.id)}
                >
                  Refuser
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

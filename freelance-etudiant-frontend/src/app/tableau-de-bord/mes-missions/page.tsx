"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Candidature, Mission } from "@/lib/types";
import {
  formatArgent,
  formatDate,
  statutCandidatureLabel,
  statutMissionLabel,
} from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { NoticeCard, StampBadge, Tag } from "@/components/ui/Notice";

export default function MesMissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [missionOuverte, setMissionOuverte] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await api.get<Mission[]>("/missions/me/mes-missions");
      setMissions(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-semibold">Mes missions</h1>
        <Button
          variant="secondary"
          onClick={() => setAfficherFormulaire((v) => !v)}
        >
          {afficherFormulaire ? "Fermer" : "+ Publier une mission"}
        </Button>
      </div>

      {afficherFormulaire && (
        <div className="mb-8">
          <FormulaireMission
            onCree={() => {
              setAfficherFormulaire(false);
              charger();
            }}
          />
        </div>
      )}

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : missions.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Vous n&apos;avez pas encore publié de mission.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {missions.map((mission) => (
            <NoticeCard key={mission.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag tone="rice">{statutMissionLabel[mission.statut]}</Tag>
                    <Tag tone="ink">{mission.categorie}</Tag>
                  </div>
                  <p className="font-display text-lg font-medium">
                    {mission.titre}
                  </p>
                  <p className="text-xs text-ink-soft/70 mt-1">
                    {mission.candidatures?.length ?? 0} candidature(s) reçue(s)
                    · budget {formatArgent(mission.budget)}
                  </p>
                </div>
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

function FormulaireMission({ onCree }: { onCree: () => void }) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("");
  const [budget, setBudget] = useState("");
  const [dateLimite, setDateLimite] = useState("");
  const [competencesRequises, setCompetencesRequises] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post("/missions", {
        titre,
        description,
        categorie,
        budget: Number(budget),
        dateLimite,
        competencesRequises: competencesRequises
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });
      onCree();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur inattendue");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <h2 className="font-display text-xl font-semibold mb-4">
        Nouvelle mission
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Titre" htmlFor="titre">
          <Input
            id="titre"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Développement d'un site vitrine"
          />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Catégorie" htmlFor="categorie">
            <Input
              id="categorie"
              required
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              placeholder="Développement"
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
            />
          </Field>
          <Field label="Date limite" htmlFor="dateLimite">
            <Input
              id="dateLimite"
              type="date"
              required
              value={dateLimite}
              onChange={(e) => setDateLimite(e.target.value)}
            />
          </Field>
        </div>
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
          />
        </Field>

        {erreur && <p className="text-sm text-brique">{erreur}</p>}

        <Button type="submit" disabled={envoi} className="self-start">
          {envoi ? "Publication…" : "Publier"}
        </Button>
      </form>
    </NoticeCard>
  );
}

function CandidaturesMission({ missionId }: { missionId: string }) {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await api.get<Candidature[]>(
        `/missions/${missionId}/candidatures`,
      );
      setCandidatures(data);
    } finally {
      setChargement(false);
    }
  }, [missionId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function accepter(id: string) {
    await api.patch(`/candidatures/${id}/accepter`);
    charger();
  }

  async function refuser(id: string) {
    await api.patch(`/candidatures/${id}/refuser`);
    charger();
  }

  if (chargement) return <p className="text-sm text-ink-soft">Chargement…</p>;
  if (candidatures.length === 0)
    return (
      <p className="text-sm text-ink-soft">
        Aucune candidature reçue pour l&apos;instant.
      </p>
    );

  return (
    <div className="flex flex-col gap-4">
      {candidatures.map((candidature) => (
        <div
          key={candidature.id}
          className="border border-ink/15 p-4 bg-paper/60"
        >
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
                  {candidature.etudiant?.utilisateur?.nom}
                </p>
                <p className="text-xs text-ink-soft/70">
                  {formatArgent(candidature.prixPropose)} ·{" "}
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

          {candidature.message && (
            <p className="mt-3 text-sm text-ink-soft">{candidature.message}</p>
          )}

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

          {candidature.statut === "acceptee" && (
            <LivraisonCandidature
              candidatureId={candidature.id}
              livraisonInitiale={candidature.livraison ?? null}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function LivraisonCandidature({
  candidatureId,
  livraisonInitiale,
}: {
  candidatureId: string;
  livraisonInitiale: import("@/lib/types").Livraison | null;
}) {
  const [livraison, setLivraison] = useState(livraisonInitiale);
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");
  const [evalue, setEvalue] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function rafraichirLivraison() {
    if (!livraison) return;
    const misAJour = await api.get<import("@/lib/types").Livraison>(
      `/livraisons/${livraison.id}`,
    );
    setLivraison(misAJour);
  }

  async function valider() {
    if (!livraison) return;
    await api.patch(`/livraisons/${livraison.id}/valider`);
    await rafraichirLivraison();
  }

  async function envoyerEvaluation() {
    if (!livraison) return;
    setErreur(null);
    try {
      await api.post(`/livraisons/${livraison.id}/evaluation`, {
        note,
        commentaire: commentaire || undefined,
      });
      setEvalue(true);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur inattendue");
    }
  }

  if (!livraison) {
    return (
      <p className="mt-3 text-xs text-ink-soft/70 italic">
        En attente de la livraison de l&apos;étudiant. Actualisez cette page
        une fois le travail déposé.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-ink/10 pt-4">
      <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-2">
        Livraison
      </p>
      {livraison.lienLivrable && (
        <a
          href={livraison.lienLivrable}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-ocre-dark hover:underline break-all"
        >
          {livraison.lienLivrable}
        </a>
      )}
      {livraison.commentaireLivraison && (
        <p className="mt-1 text-sm text-ink-soft">
          {livraison.commentaireLivraison}
        </p>
      )}

      {livraison.statut === "en_attente" && (
        <Button size="sm" className="mt-3" onClick={valider}>
          Valider la livraison
        </Button>
      )}

      {livraison.statut === "validee" && !evalue && (
        <div className="mt-3 flex flex-col gap-3 max-w-sm">
          <Field label="Note (1 à 5)" htmlFor={`note-${candidatureId}`}>
            <select
              id={`note-${candidatureId}`}
              value={note}
              onChange={(e) => setNote(Number(e.target.value))}
              className="border border-ink/30 bg-paper-light px-3 py-2 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Textarea
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Commentaire (optionnel)"
          />
          {erreur && <p className="text-xs text-brique">{erreur}</p>}
          <Button size="sm" onClick={envoyerEvaluation} className="self-start">
            Évaluer ce travail
          </Button>
        </div>
      )}

      {(evalue || livraison.statut === "validee") && evalue && (
        <p className="mt-3 text-sm text-rice">Merci pour votre évaluation !</p>
      )}
    </div>
  );
}

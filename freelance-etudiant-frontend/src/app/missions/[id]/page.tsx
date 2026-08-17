"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Mission } from "@/lib/types";
import { formatArgent, formatDate, statutMissionLabel } from "@/lib/format";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { utilisateur } = useAuth();
  const router = useRouter();

  const [mission, setMission] = useState<Mission | null>(null);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [prixPropose, setPrixPropose] = useState("");
  const [delaiPropose, setDelaiPropose] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    api
      .get<Mission>(`/missions/${id}`, { auth: false })
      .then(setMission)
      .finally(() => setChargement(false));
  }, [id]);

  async function postuler(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/missions/${id}/candidatures`, {
        prixPropose: Number(prixPropose),
        delaiPropose: Number(delaiPropose),
        message: message || undefined,
      });
      setSucces(true);
      setAfficherFormulaire(false);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible d'envoyer la candidature",
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (chargement) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  if (!mission) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-brique">
        Cette mission est introuvable.
      </p>
    );
  }

  const estEtudiant = utilisateur?.role === "etudiant";
  const estProprietaire = utilisateur?.id === mission.clientId;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="flex items-center gap-3 mb-4">
        <Tag tone="rice">{mission.categorie}</Tag>
        <Tag tone="ink">{statutMissionLabel[mission.statut]}</Tag>
      </div>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-3">
        {mission.titre}
      </h1>
      <p className="text-sm text-ink-soft mb-8">
        Publiée le {formatDate(mission.dateCreation)} · candidatures ouvertes
        jusqu&apos;au {formatDate(mission.dateLimite)}
      </p>

      <NoticeCard className="mb-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
              Budget
            </p>
            <p className="font-display text-2xl text-ocre-dark">
              {formatArgent(mission.budget)}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
              Date limite de candidature
            </p>
            <p className="font-display text-2xl">{formatDate(mission.dateLimite)}</p>
          </div>
        </div>
      </NoticeCard>

      <div className="prose-none mb-8">
        <h2 className="font-display text-xl font-semibold mb-3">Description</h2>
        <p className="text-sm text-ink-soft whitespace-pre-line leading-relaxed">
          {mission.description}
        </p>
      </div>

      {mission.competencesRequises.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-xl font-semibold mb-3">
            Compétences requises
          </h2>
          <div className="flex flex-wrap gap-2">
            {mission.competencesRequises.map((c) => (
              <Tag key={c} tone="ocre">
                {c}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* --- Candidature --- */}
      {succes ? (
        <NoticeCard className="border-rice/50">
          <p className="text-rice font-medium">
            Votre candidature a bien été envoyée. Le client pourra maintenant
            l&apos;examiner.
          </p>
        </NoticeCard>
      ) : estEtudiant && !estProprietaire && mission.statut === "ouverte" ? (
        afficherFormulaire ? (
          <NoticeCard>
            <h2 className="font-display text-xl font-semibold mb-4">
              Postuler à cette mission
            </h2>
            <form onSubmit={postuler} className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Prix proposé (Ar)" htmlFor="prixPropose">
                  <Input
                    id="prixPropose"
                    type="number"
                    min={0}
                    required
                    value={prixPropose}
                    onChange={(e) => setPrixPropose(e.target.value)}
                  />
                </Field>
                <Field label="Délai proposé (jours)" htmlFor="delaiPropose">
                  <Input
                    id="delaiPropose"
                    type="number"
                    min={1}
                    required
                    value={delaiPropose}
                    onChange={(e) => setDelaiPropose(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Message (optionnel)" htmlFor="message">
                <Textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Présentez brièvement votre approche…"
                />
              </Field>
              {erreur && <p className="text-sm text-brique">{erreur}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={envoi}>
                  {envoi ? "Envoi…" : "Envoyer ma candidature"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAfficherFormulaire(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </NoticeCard>
        ) : (
          <Button size="lg" onClick={() => setAfficherFormulaire(true)}>
            Postuler à cette mission
          </Button>
        )
      ) : !utilisateur ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            <button
              onClick={() => router.push("/connexion")}
              className="text-ocre-dark hover:underline"
            >
              Connectez-vous
            </button>{" "}
            en tant qu&apos;étudiant pour postuler à cette mission.
          </p>
        </NoticeCard>
      ) : null}
    </div>
  );
}

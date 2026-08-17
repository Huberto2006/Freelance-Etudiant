"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Candidature } from "@/lib/types";
import {
  formatArgent,
  statutCandidatureLabel,
  statutLivraisonLabel,
} from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { NoticeCard, Tag } from "@/components/ui/Notice";

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await api.get<Candidature[]>("/candidatures/me");
      setCandidatures(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-8">
        Mes candidatures
      </h1>

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : candidatures.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Vous n&apos;avez pas encore postulé à une mission.{" "}
          <Link href="/missions" className="text-ocre-dark hover:underline">
            Parcourir les missions
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {candidatures.map((candidature) => (
            <NoticeCard key={candidature.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
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
                  <p className="mt-3 font-display text-lg font-medium">
                    {candidature.mission?.titre}
                  </p>
                  <p className="text-xs text-ink-soft/70 mt-1">
                    proposé : {formatArgent(candidature.prixPropose)} en{" "}
                    {candidature.delaiPropose} jours
                  </p>
                </div>
                {candidature.mission && (
                  <Link href={`/missions/${candidature.mission.id}`}>
                    <Button size="sm" variant="ghost">
                      Voir la mission
                    </Button>
                  </Link>
                )}
              </div>

              {candidature.statut === "acceptee" && (
                <div className="mt-5 border-t border-ink/15 pt-5">
                  <LivraisonForm candidatureId={candidature.id} />
                </div>
              )}
            </NoticeCard>
          ))}
        </div>
      )}
    </div>
  );
}

function LivraisonForm({ candidatureId }: { candidatureId: string }) {
  const [lienLivrable, setLienLivrable] = useState("");
  const [commentaireLivraison, setCommentaireLivraison] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/candidatures/${candidatureId}/livraison`, {
        lienLivrable: lienLivrable || undefined,
        commentaireLivraison: commentaireLivraison || undefined,
      });
      setEnvoye(true);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur inattendue");
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <p className="text-sm text-rice">
        Livraison envoyée. Le client peut maintenant la valider.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 max-w-md">
      <p className="text-xs font-mono uppercase tracking-wider text-ink-soft">
        Déposer ma livraison — {statutLivraisonLabel.en_attente}
      </p>
      <Field label="Lien vers le livrable" htmlFor={`lien-${candidatureId}`}>
        <Input
          id={`lien-${candidatureId}`}
          value={lienLivrable}
          onChange={(e) => setLienLivrable(e.target.value)}
          placeholder="https://github.com/…"
        />
      </Field>
      <Field label="Commentaire" htmlFor={`commentaire-${candidatureId}`}>
        <Textarea
          id={`commentaire-${candidatureId}`}
          rows={2}
          value={commentaireLivraison}
          onChange={(e) => setCommentaireLivraison(e.target.value)}
          placeholder="Précisions sur la livraison…"
        />
      </Field>
      {erreur && <p className="text-xs text-brique">{erreur}</p>}
      <Button type="submit" size="sm" disabled={envoi} className="self-start">
        {envoi ? "Envoi…" : "Envoyer la livraison"}
      </Button>
    </form>
  );
}

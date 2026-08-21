"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Candidature } from "@/lib/types";
import {
  formatArgent,
  statutCandidatureLabel,
  statutLivraisonLabel,
} from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  /*
   * Chargement initial.
   *
   * On effectue la requête directement dans une fonction
   * asynchrone à l'intérieur de l'effect afin d'éviter
   * l'avertissement React concernant setState().
   */
  useEffect(() => {
    let cancelled = false;

    async function chargerInitial() {
      setChargement(true);
      setErreur(null);

      try {
        const data = await api.get<Candidature[]>(
          "/candidatures/me",
        );

        if (!cancelled) {
          setCandidatures(data);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement des candidatures :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger vos candidatures.",
          );
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    }

    chargerInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* En-tête */}
      <PageHeader
        icon={ClipboardList}
        eyebrow="Espace étudiant"
        title="Mes candidatures"
      />

      {/* Erreur */}
      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">{erreur}</p>
        </NoticeCard>
      )}

      {/* Chargement */}
      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : candidatures.length === 0 ? (
        /* Aucune candidature */
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Vous n&apos;avez pas encore postulé à une mission.{" "}
            <Link
              href="/missions"
              className="text-ocre-dark hover:underline"
            >
              Parcourir les missions
            </Link>
          </p>
        </NoticeCard>
      ) : (
        /* Liste */
        <div className="flex flex-col gap-4">
          {candidatures.map((candidature) => (
            <NoticeCard key={candidature.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Informations candidature */}
                <div className="min-w-0">
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

                  <p className="mt-1 text-xs text-ink-soft/70">
                    proposé :{" "}
                    {formatArgent(candidature.prixPropose)}{" "}
                    en {candidature.delaiPropose} jours
                  </p>
                </div>

                {/* Voir la mission */}
                {candidature.mission && (
                  <Link
                    href={`/missions/${candidature.mission.id}`}
                  >
                    <Button size="sm" variant="ghost">
                      Voir la mission
                    </Button>
                  </Link>
                )}
              </div>

              {/* Livraison */}
              {candidature.statut === "acceptee" && (
                <div className="mt-5 border-t border-ink/15 pt-5">
                  <LivraisonForm
                    candidatureId={candidature.id}
                  />
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
   FORMULAIRE DE LIVRAISON
   ========================================================= */

function LivraisonForm({
  candidatureId,
}: {
  candidatureId: string;
}) {
  const [lienLivrable, setLienLivrable] = useState("");
  const [commentaireLivraison, setCommentaireLivraison] =
    useState("");

  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setErreur(null);
    setEnvoi(true);

    try {
      await api.post(
        `/candidatures/${candidatureId}/livraison`,
        {
          lienLivrable:
            lienLivrable.trim() || undefined,

          commentaireLivraison:
            commentaireLivraison.trim() || undefined,
        },
      );

      setEnvoye(true);
    } catch (err) {
      console.error(
        "Erreur lors de l'envoi de la livraison :",
        err,
      );

      setErreur(
        err instanceof ApiError
          ? err.message
          : "Erreur inattendue lors de l'envoi de la livraison.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  /* Livraison envoyée */
  if (envoye) {
    return (
      <div className="rounded-lg border border-rice/20 bg-rice/5 p-4">
        <p className="text-sm text-rice">
          Livraison envoyée. Le client peut maintenant la valider.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-md flex-col gap-3"
    >
      <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
        Déposer ma livraison —{" "}
        {statutLivraisonLabel.en_attente}
      </p>

      {/* Lien livrable */}
      <Field
        label="Lien vers le livrable"
        htmlFor={`lien-${candidatureId}`}
      >
        <Input
          id={`lien-${candidatureId}`}
          value={lienLivrable}
          onChange={(e) =>
            setLienLivrable(e.target.value)
          }
          placeholder="https://github.com/…"
          disabled={envoi}
        />
      </Field>

      {/* Commentaire */}
      <Field
        label="Commentaire"
        htmlFor={`commentaire-${candidatureId}`}
      >
        <Textarea
          id={`commentaire-${candidatureId}`}
          rows={2}
          value={commentaireLivraison}
          onChange={(e) =>
            setCommentaireLivraison(e.target.value)
          }
          placeholder="Précisions sur la livraison…"
          disabled={envoi}
        />
      </Field>

      {/* Erreur */}
      {erreur && (
        <p className="text-xs text-brique">
          {erreur}
        </p>
      )}

      {/* Bouton */}
      <Button
        type="submit"
        size="sm"
        disabled={envoi}
        className="self-start"
      >
        {envoi
          ? "Envoi…"
          : "Envoyer la livraison"}
      </Button>
    </form>
  );
}
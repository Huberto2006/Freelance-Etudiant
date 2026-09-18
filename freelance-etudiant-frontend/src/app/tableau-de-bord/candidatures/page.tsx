"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, MessageCircle, Package } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Candidature } from "@/lib/types";
import { SousNavigation } from "@/components/ui/SousNavigation";

import { formatArgent, statutCandidatureLabel } from "@/lib/format";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";

import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);

  // Sous-menu actif : En attente / Acceptées / Refusées
  const [ongletCandidatures, setOngletCandidatures] = useState("toutes");

  const [chargement, setChargement] = useState(true);

  const [erreur, setErreur] = useState<string | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [prixEdition, setPrixEdition] = useState("");
  const [delaiEdition, setDelaiEdition] = useState("");
  const [messageEdition, setMessageEdition] = useState("");
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  /*
   * Chargement initial.
   */
  useEffect(() => {
    let cancelled = false;

    async function chargerInitial() {
      try {
        const data = await api.get<Candidature[]>("/candidatures/me");

        if (!cancelled) {
          setCandidatures(data);
          setErreur(null);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des candidatures :", error);

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

  /**
   * Récupère l'identifiant du client.
   *
   * candidature
   *   -> mission
   *      -> client
   *         -> utilisateur
   */
  function getClientId(candidature: Candidature): string | null {
    return candidature.mission?.client?.utilisateur?.id ?? null;
  }

  /**
   * Récupère le nom du client.
   */
  function getClientNom(candidature: Candidature): string {
    return (
      candidature.mission?.client?.utilisateur?.nom ??
      candidature.mission?.client?.nomEntreprise ??
      "Client"
    );
  }

  function commencerEdition(candidature: Candidature) {
    setEditionId(candidature.id);
    setPrixEdition(String(candidature.prixPropose));
    setDelaiEdition(String(candidature.delaiPropose));
    setMessageEdition(candidature.message ?? "");
    setErreur(null);
  }

  async function enregistrerEdition(candidature: Candidature) {
    setActionEnCours(candidature.id);
    setErreur(null);
    try {
      const maj = await api.patch<Candidature>(
        `/candidatures/${candidature.id}`,
        {
          prixPropose: Number(prixEdition),
          delaiPropose: Number(delaiEdition),
          message: messageEdition.trim() || undefined,
        },
      );
      setCandidatures((courantes) =>
        courantes.map((courante) =>
          courante.id === maj.id ? { ...courante, ...maj } : courante,
        ),
      );
      setEditionId(null);
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de modifier la candidature.",
      );
    } finally {
      setActionEnCours(null);
    }
  }

  async function annuler(candidature: Candidature) {
    if (!window.confirm("Annuler cette candidature en attente ?")) return;
    setActionEnCours(candidature.id);
    setErreur(null);
    try {
      await api.delete(`/candidatures/${candidature.id}`);
      setCandidatures((courantes) =>
        courantes.filter((courante) => courante.id !== candidature.id),
      );
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'annuler la candidature.",
      );
    } finally {
      setActionEnCours(null);
    }
  }

  return (
    <div>
      {/* =====================================================
          EN-TÊTE
          ===================================================== */}
      <PageHeader
        icon={ClipboardList}
        eyebrow="Espace étudiant"
        title="Mes candidatures"
      />

      {/* =====================================================
          ERREUR
          ===================================================== */}
      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">{erreur}</p>
        </NoticeCard>
      )}

      {/* =====================================================
          CHARGEMENT
          ===================================================== */}
      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : candidatures.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Vous n&apos;avez pas encore postulé à une mission.{" "}
            <Link href="/missions" className="text-ocre-dark hover:underline">
              Parcourir les missions
            </Link>
          </p>
        </NoticeCard>
      ) : (
        /* ===================================================
           LISTE DES CANDIDATURES (avec sous-menus par statut)
           =================================================== */
        (() => {
          const enAttente = candidatures.filter(
            (c) => c.statut === "en_attente",
          ).length;
          const acceptees = candidatures.filter(
            (c) => c.statut === "acceptee",
          ).length;
          const refusees = candidatures.filter(
            (c) => c.statut === "refusee",
          ).length;

          const candidaturesAffichees = candidatures.filter((candidature) => {
            switch (ongletCandidatures) {
              case "en_attente":
                return candidature.statut === "en_attente";
              case "acceptees":
                return candidature.statut === "acceptee";
              case "refusees":
                return candidature.statut === "refusee";
              default:
                return true;
            }
          });

          return (
            <>
              <SousNavigation
                onglets={[
                  {
                    valeur: "toutes",
                    label: "Toutes",
                    compte: candidatures.length,
                  },
                  {
                    valeur: "en_attente",
                    label: "En attente",
                    compte: enAttente,
                  },
                  {
                    valeur: "acceptees",
                    label: "Acceptées",
                    compte: acceptees,
                  },
                  {
                    valeur: "refusees",
                    label: "Refusées",
                    compte: refusees,
                  },
                ]}
                actif={ongletCandidatures}
                onChanger={setOngletCandidatures}
              />

              {candidaturesAffichees.length === 0 ? (
                <NoticeCard>
                  <p className="text-sm text-ink-soft">
                    Aucune candidature dans cette catégorie.
                  </p>
                </NoticeCard>
              ) : (
                <div className="flex flex-col gap-4">
                  {candidaturesAffichees.map((candidature) => {
            const clientId = getClientId(candidature);

            const clientNom = getClientNom(candidature);

            const missionId = candidature.mission?.id ?? candidature.missionId;

            return (
              <NoticeCard key={candidature.id}>
                {/* =================================================
                    INFORMATIONS DE LA CANDIDATURE
                    ================================================= */}
                {editionId !== candidature.id && (
                <div className="flex flex-wrap items-start justify-between gap-4">
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
                      {candidature.mission?.titre ?? "Mission"}
                    </p>

                    <p className="mt-1 text-xs text-ink-soft/70">
                      proposé : {formatArgent(candidature.prixPropose)} en{" "}
                      {candidature.delaiPropose} jours
                    </p>
                  </div>

                  {/* =================================================
                      VOIR LA MISSION
                      ================================================= */}
                  {missionId && (
                    <Link href={`/missions/${missionId}`}>
                      <Button size="sm" variant="ghost">
                        Voir la mission
                      </Button>
                    </Link>
                  )}
                </div>
                )}

                {editionId === candidature.id && (
                  <div className="flex flex-col gap-4">
                    <p className="font-display text-lg font-medium">
                      Modifier votre candidature
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Prix proposé (Ar)" htmlFor={`prix-${candidature.id}`}>
                        <Input
                          id={`prix-${candidature.id}`}
                          type="number"
                          min={0}
                          value={prixEdition}
                          onChange={(event) => setPrixEdition(event.target.value)}
                        />
                      </Field>
                      <Field label="Délai proposé (jours)" htmlFor={`delai-${candidature.id}`}>
                        <Input
                          id={`delai-${candidature.id}`}
                          type="number"
                          min={1}
                          value={delaiEdition}
                          onChange={(event) => setDelaiEdition(event.target.value)}
                        />
                      </Field>
                    </div>
                    <Field label="Message (optionnel)" htmlFor={`message-${candidature.id}`}>
                      <Textarea
                        id={`message-${candidature.id}`}
                        value={messageEdition}
                        onChange={(event) => setMessageEdition(event.target.value)}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={actionEnCours !== null}
                        onClick={() => void enregistrerEdition(candidature)}
                      >
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditionId(null)}>
                        Fermer
                      </Button>
                    </div>
                  </div>
                )}

                {/* =================================================
                    ACTIONS SI CANDIDATURE ACCEPTÉE
                    ================================================= */}
                {candidature.statut === "acceptee" && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/15 pt-5">
                    {/* =============================================
                        DISCUSSION AVEC LE CLIENT
                        ============================================= */}
                    {clientId && (
                      <Link
                        href={`/tableau-de-bord/messages?contact=${encodeURIComponent(
                          clientId,
                        )}&nom=${encodeURIComponent(clientNom)}`}
                      >
                        <Button
                          size="sm"
                          className="inline-flex items-center gap-2"
                        >
                          <MessageCircle size={16} />
                          Discuter avec le client
                        </Button>
                      </Link>
                    )}

                    {/* =============================================
                        LIVRAISON
                        ============================================= */}
                    <Link
                      href={`/tableau-de-bord/livraisons?candidature=${encodeURIComponent(
                        candidature.id,
                      )}&role=etudiant`}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="inline-flex items-center gap-2"
                      >
                        <Package size={16} />

                        {candidature.livraison
                          ? "Suivre ma livraison"
                          : "Déposer ma livraison"}
                      </Button>
                    </Link>
                  </div>
                )}

                {candidature.statut === "en_attente" && editionId !== candidature.id && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/15 pt-5">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actionEnCours !== null}
                      onClick={() => commencerEdition(candidature)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actionEnCours !== null}
                      onClick={() => void annuler(candidature)}
                      className="text-brique"
                    >
                      Annuler
                    </Button>
                  </div>
                )}
              </NoticeCard>
            );
                  })}
                </div>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}

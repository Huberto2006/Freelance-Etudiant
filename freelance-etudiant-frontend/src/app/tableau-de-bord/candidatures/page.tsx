"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, MessageCircle, Package } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { Candidature } from "@/lib/types";

import { formatArgent, statutCandidatureLabel } from "@/lib/format";

import { Button } from "@/components/ui/Button";

import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);

  const [chargement, setChargement] = useState(true);

  const [erreur, setErreur] = useState<string | null>(null);

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
           LISTE DES CANDIDATURES
           =================================================== */
        <div className="flex flex-col gap-4">
          {candidatures.map((candidature) => {
            const clientId = getClientId(candidature);

            const clientNom = getClientNom(candidature);

            const missionId = candidature.mission?.id ?? candidature.missionId;

            return (
              <NoticeCard key={candidature.id}>
                {/* =================================================
                    INFORMATIONS DE LA CANDIDATURE
                    ================================================= */}
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
              </NoticeCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

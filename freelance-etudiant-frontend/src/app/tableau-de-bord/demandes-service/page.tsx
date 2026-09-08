"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { DemandeService } from "@/lib/types";
import { formatArgent, formatDateCourte, statutDemandeServiceLabel } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { PieceJointeAffichage } from "@/components/ui/PieceJointe";
import { SousNavigation } from "@/components/ui/SousNavigation";

const toneParStatut: Record<string, "ocre" | "rice" | "brique" | "ink"> = {
  en_attente: "ocre",
  acceptee: "rice",
  refusee: "brique",
};

/* =========================================================
   VUE CLIENT — mes demandes envoyées
   ========================================================= */

function VueClient() {
  const [demandes, setDemandes] = useState<DemandeService[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState("toutes");

  useEffect(() => {
    api
      .get<DemandeService[]>("/demandes-service/me")
      .then(setDemandes)
      .finally(() => setChargement(false));
  }, []);

  if (chargement) return <p className="text-sm text-ink-soft">Chargement…</p>;

  if (demandes.length === 0) {
    return (
      <NoticeCard>
        <p className="text-sm text-ink-soft/70">
          Vous n&apos;avez pas encore commandé de service. Rendez-vous sur la
          page « Services » pour trouver un étudiant et lui envoyer un
          cahier des charges.
        </p>
      </NoticeCard>
    );
  }

  const enAttente = demandes.filter((d) => d.statut === "en_attente").length;
  const acceptees = demandes.filter((d) => d.statut === "acceptee").length;
  const refusees = demandes.filter((d) => d.statut === "refusee").length;

  const demandesAffichees =
    onglet === "toutes" ? demandes : demandes.filter((d) => d.statut === onglet);

  return (
    <div>
      <SousNavigation
        onglets={[
          { valeur: "toutes", label: "Toutes", compte: demandes.length },
          { valeur: "en_attente", label: "En attente", compte: enAttente },
          { valeur: "acceptee", label: "Acceptées", compte: acceptees },
          { valeur: "refusee", label: "Refusées", compte: refusees },
        ]}
        actif={onglet}
        onChanger={setOnglet}
      />

      {demandesAffichees.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft/70">
            Aucune demande dans cette catégorie.
          </p>
        </NoticeCard>
      ) : (
        <div className="flex flex-col gap-4">
          {demandesAffichees.map((d) => (
        <NoticeCard key={d.id} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display font-medium">{d.service?.titre}</p>
              <p className="text-xs text-ink-soft/70">
                par {d.service?.etudiant?.utilisateur?.nom ?? "l'étudiant"}
              </p>
            </div>
            <Tag tone={toneParStatut[d.statut]}>
              {statutDemandeServiceLabel[d.statut]}
            </Tag>
          </div>

          <p className="text-sm text-ink-soft whitespace-pre-line">
            {d.cahierDesCharges}
          </p>

          {d.pieceJointeUrl && (
            <PieceJointeAffichage url={d.pieceJointeUrl} nom={d.pieceJointeNom} />
          )}

          <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-sm">
            <span className="font-mono text-ocre-dark">
              {formatArgent(d.budgetPropose)} · {d.delaiSouhaite} j
            </span>
            <span className="text-xs text-ink-soft/60">
              {formatDateCourte(d.dateCreation)}
            </span>
          </div>

          {d.statut === "acceptee" && d.missionId && (
            <Link href="/tableau-de-bord/mes-missions">
              <Button size="sm" variant="secondary" className="self-start gap-2">
                <MessageCircle size={14} />
                Suivre le projet dans « Mes missions »
              </Button>
            </Link>
          )}
        </NoticeCard>
      ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   VUE ÉTUDIANT — demandes reçues sur mes services
   ========================================================= */

function VueEtudiant() {
  const [demandes, setDemandes] = useState<DemandeService[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState("toutes");

  const charger = useCallback(() => {
    setChargement(true);
    api
      .get<DemandeService[]>("/demandes-service/recues")
      .then(setDemandes)
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    // Differre l'appel hors du corps synchrone de l'effet (react-hooks/
    // set-state-in-effect) : charger() met a jour l'etat des son entree.
    void Promise.resolve().then(() => {
      charger();
    });
  }, [charger]);

  async function accepter(id: string) {
    setEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/demandes-service/${id}/accepter`);
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setEnCours(null);
    }
  }

  async function refuser(id: string) {
    setEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/demandes-service/${id}/refuser`);
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setEnCours(null);
    }
  }

  if (chargement) return <p className="text-sm text-ink-soft">Chargement…</p>;

  if (demandes.length === 0) {
    return (
      <NoticeCard>
        <p className="text-sm text-ink-soft/70">
          Aucune demande reçue pour l&apos;instant sur vos services.
        </p>
      </NoticeCard>
    );
  }

  const enAttente = demandes.filter((d) => d.statut === "en_attente").length;
  const acceptees = demandes.filter((d) => d.statut === "acceptee").length;
  const refusees = demandes.filter((d) => d.statut === "refusee").length;

  const demandesAffichees =
    onglet === "toutes" ? demandes : demandes.filter((d) => d.statut === onglet);

  return (
    <div>
      <SousNavigation
        onglets={[
          { valeur: "toutes", label: "Toutes", compte: demandes.length },
          { valeur: "en_attente", label: "En attente", compte: enAttente },
          { valeur: "acceptee", label: "Acceptées", compte: acceptees },
          { valeur: "refusee", label: "Refusées", compte: refusees },
        ]}
        actif={onglet}
        onChanger={setOnglet}
      />

      {erreur && <p className="mb-3 text-sm text-brique">{erreur}</p>}

      {demandesAffichees.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft/70">
            Aucune demande dans cette catégorie.
          </p>
        </NoticeCard>
      ) : (
        <div className="flex flex-col gap-4">
          {demandesAffichees.map((d) => (
        <NoticeCard key={d.id} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display font-medium">{d.service?.titre}</p>
              <p className="text-xs text-ink-soft/70">
                demande de {d.client?.nom ?? "un client"}
              </p>
            </div>
            <Tag tone={toneParStatut[d.statut]}>
              {statutDemandeServiceLabel[d.statut]}
            </Tag>
          </div>

          <div className="rounded-lg border border-ink/10 bg-ink/[0.02] p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-soft">
              <FileText size={12} />
              Cahier des charges
            </p>
            <p className="text-sm text-ink-soft whitespace-pre-line">
              {d.cahierDesCharges}
            </p>
            {d.pieceJointeUrl && (
              <div className="mt-2">
                <PieceJointeAffichage url={d.pieceJointeUrl} nom={d.pieceJointeNom} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-sm">
            <span className="font-mono text-ocre-dark">
              {formatArgent(d.budgetPropose)} · {d.delaiSouhaite} j
            </span>
            <span className="text-xs text-ink-soft/60">
              {formatDateCourte(d.dateCreation)}
            </span>
          </div>

          {d.statut === "en_attente" && (
            <div className="flex gap-2">
              <Button size="sm" disabled={enCours === d.id} onClick={() => accepter(d.id)}>
                Accepter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={enCours === d.id}
                onClick={() => refuser(d.id)}
              >
                Refuser
              </Button>
            </div>
          )}

          {d.statut === "acceptee" && d.missionId && (
            <Link href="/tableau-de-bord/candidatures">
              <Button size="sm" variant="secondary" className="self-start gap-2">
                <MessageCircle size={14} />
                Suivre le projet dans « Mes candidatures »
              </Button>
            </Link>
          )}
        </NoticeCard>
      ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function DemandesServicePage() {
  const { utilisateur } = useAuth();

  if (!utilisateur) return null;

  return (
    <div>

      <PageHeader
        icon={FileText}
        eyebrow="Commandes de service"
        title="Demandes de service"
      />

      {utilisateur.role === "client" && <VueClient />}
      {utilisateur.role === "etudiant" && <VueEtudiant />}
    </div>
  );
}

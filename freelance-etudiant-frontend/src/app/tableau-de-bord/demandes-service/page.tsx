"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { DemandeService } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { Button } from "@/components/ui/Button";
import { BadgeStatut, ChargementPage, EtatVide, NoticeCard, PageHeader } from "@/components/ui/Notice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PieceJointeAffichage } from "@/components/ui/PieceJointe";
import { SousNavigation } from "@/components/ui/SousNavigation";

/* =========================================================
   VUE CLIENT — mes demandes envoyées
   ========================================================= */

function VueClient() {
  const t = useTranslations("dashboardPages.serviceRequests");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { statutDemandeService } = useLabels();
  const [demandes, setDemandes] = useState<DemandeService[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState("toutes");

  useEffect(() => {
    api
      .get<DemandeService[]>("/demandes-service/me")
      .then(setDemandes)
      .finally(() => setChargement(false));
  }, []);

  if (chargement) return <ChargementPage />;

  if (demandes.length === 0) {
    return <EtatVide icon={FileText}>{t("client.empty")}</EtatVide>;
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
          { valeur: "toutes", label: t("tabs.all"), compte: demandes.length },
          { valeur: "en_attente", label: t("tabs.pending"), compte: enAttente },
          { valeur: "acceptee", label: t("tabs.accepted"), compte: acceptees },
          { valeur: "refusee", label: t("tabs.refused"), compte: refusees },
        ]}
        actif={onglet}
        onChanger={setOnglet}
      />

      {demandesAffichees.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft/70">
            {t("emptyCategory")}
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
                {t("client.by", {
                  nom: d.service?.etudiant?.utilisateur?.nom ?? t("client.studentFallback"),
                })}
              </p>
            </div>
            <BadgeStatut
              statut={d.statut}
              labels={{ [d.statut]: statutDemandeService(d.statut) }}
            />
          </div>

          <p className="text-sm text-ink-soft whitespace-pre-line">
            {d.cahierDesCharges}
          </p>

          {d.pieceJointeUrl && (
            <PieceJointeAffichage url={d.pieceJointeUrl} nom={d.pieceJointeNom} />
          )}

          <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-sm">
            <span className="font-mono text-ocre-dark">
              {formatArgent(d.budgetPropose)} · {t("daysShort", { count: d.delaiSouhaite })}
            </span>
            <span className="text-xs text-ink-soft/60">
              {formatDateCourte(d.dateCreation)}
            </span>
          </div>

          {d.statut === "acceptee" && d.missionId && (
            <Link href="/tableau-de-bord/mes-missions">
              <Button size="sm" variant="secondary" className="self-start gap-2">
                <MessageCircle size={14} />
                {t("client.followProject")}
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
  const t = useTranslations("dashboardPages.serviceRequests");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { statutDemandeService } = useLabels();
  const toast = useToast();
  const [demandes, setDemandes] = useState<DemandeService[]>([]);
  // `chargement` ne vaut true que pour le premier chargement : après une
  // action, la liste reste affichée pendant le rechargement.
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [onglet, setOnglet] = useState("toutes");

  type ActionDemande = "accepter" | "refuser";
  // Demande dont une requête est réellement en cours, avec son action.
  const [enCours, setEnCours] = useState<{ id: string; action: ActionDemande } | null>(null);
  // Décision en attente de confirmation explicite.
  const [aConfirmer, setAConfirmer] = useState<{
    demande: DemandeService;
    action: ActionDemande;
  } | null>(null);

  const charger = useCallback(async () => {
    try {
      setDemandes(await api.get<DemandeService[]>("/demandes-service/recues"));
      setErreurChargement(null);
    } catch (err) {
      setErreurChargement(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setChargement(false);
    }
  }, [t]);

  useEffect(() => {
    // Differre l'appel hors du corps synchrone de l'effet (react-hooks/
    // set-state-in-effect).
    void Promise.resolve().then(() => {
      void charger();
    });
  }, [charger]);

  /**
   * Accepte ou refuse une demande. Le succès n'est annoncé qu'après la
   * réponse positive du backend ; sinon son message d'erreur est affiché et
   * la liste reste intacte.
   */
  async function executer(demande: DemandeService, action: ActionDemande) {
    if (enCours) return; // anti double-clic
    setEnCours({ id: demande.id, action });
    try {
      await api.patch(`/demandes-service/${demande.id}/${action}`);
      toast.succes(t(action === "accepter" ? "student.acceptedToast" : "student.refusedToast"));
      await charger();
    } catch (err) {
      toast.erreur(
        t("genericError"),
        err instanceof ApiError ? err.message : undefined,
      );
    } finally {
      setEnCours(null);
      setAConfirmer(null);
    }
  }

  if (chargement) return <ChargementPage />;

  if (erreurChargement && demandes.length === 0) {
    return (
      <p role="alert" className="text-sm text-brique">
        {erreurChargement}
      </p>
    );
  }

  if (demandes.length === 0) {
    return <EtatVide icon={FileText}>{t("student.empty")}</EtatVide>;
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
          { valeur: "toutes", label: t("tabs.all"), compte: demandes.length },
          { valeur: "en_attente", label: t("tabs.pending"), compte: enAttente },
          { valeur: "acceptee", label: t("tabs.accepted"), compte: acceptees },
          { valeur: "refusee", label: t("tabs.refused"), compte: refusees },
        ]}
        actif={onglet}
        onChanger={setOnglet}
      />

      {demandesAffichees.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft/70">
            {t("emptyCategory")}
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
                {t("student.requestFrom", { nom: d.client?.nom ?? t("student.clientFallback") })}
              </p>
            </div>
            <BadgeStatut
              statut={d.statut}
              labels={{ [d.statut]: statutDemandeService(d.statut) }}
            />
          </div>

          <div className="rounded-lg border border-ink/10 bg-ink/[0.02] p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-soft">
              <FileText size={12} />
              {t("student.specifications")}
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
              {formatArgent(d.budgetPropose)} · {t("daysShort", { count: d.delaiSouhaite })}
            </span>
            <span className="text-xs text-ink-soft/60">
              {formatDateCourte(d.dateCreation)}
            </span>
          </div>

          {d.statut === "en_attente" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={enCours?.id === d.id && enCours.action === "accepter"}
                disabled={enCours !== null}
                onClick={() => setAConfirmer({ demande: d, action: "accepter" })}
              >
                {t("student.accept")}
              </Button>
              <Button
                size="sm"
                variant="danger-ghost"
                loading={enCours?.id === d.id && enCours.action === "refuser"}
                disabled={enCours !== null}
                onClick={() => setAConfirmer({ demande: d, action: "refuser" })}
              >
                {t("student.refuse")}
              </Button>
            </div>
          )}

          {d.statut === "acceptee" && d.missionId && (
            <Link href="/tableau-de-bord/candidatures">
              <Button size="sm" variant="secondary" className="self-start gap-2">
                <MessageCircle size={14} />
                {t("student.followProject")}
              </Button>
            </Link>
          )}
        </NoticeCard>
      ))}
        </div>
      )}

      {/* Décision engageante : confirmation explicite avant toute requête. */}
      <ConfirmDialog
        ouvert={aConfirmer !== null}
        titre={
          aConfirmer
            ? t(
                aConfirmer.action === "accepter"
                  ? "student.confirmAcceptTitle"
                  : "student.confirmRefuseTitle",
                { nom: aConfirmer.demande.client?.nom ?? t("student.clientFallback") },
              )
            : ""
        }
        description={
          aConfirmer
            ? aConfirmer.action === "accepter"
              ? t("student.confirmAcceptDescription", {
                  montant: formatArgent(aConfirmer.demande.budgetPropose),
                  delai: t("daysShort", { count: aConfirmer.demande.delaiSouhaite }),
                })
              : t("student.confirmRefuseDescription")
            : undefined
        }
        libelleConfirmer={
          aConfirmer?.action === "accepter"
            ? t("student.confirmAcceptAction")
            : t("student.confirmRefuseAction")
        }
        destructif={aConfirmer?.action === "refuser"}
        enCours={enCours !== null}
        onConfirmer={() => {
          if (aConfirmer) void executer(aConfirmer.demande, aConfirmer.action);
        }}
        onAnnuler={() => setAConfirmer(null)}
      />
    </div>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function DemandesServicePage() {
  const t = useTranslations("dashboardPages.serviceRequests");
  const { utilisateur } = useAuth();

  if (!utilisateur) return null;

  return (
    <div>

      <PageHeader
        icon={FileText}
        eyebrow={t("eyebrow")}
        title={t("title")}
      />

      {utilisateur.role === "client" && <VueClient />}
      {utilisateur.role === "etudiant" && <VueEtudiant />}
    </div>
  );
}

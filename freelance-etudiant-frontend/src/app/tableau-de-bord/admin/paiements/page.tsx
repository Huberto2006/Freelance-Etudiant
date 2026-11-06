"use client";

import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import type { Transaction } from "@/types/paiements";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useApiList } from "@/hooks/useApiList";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type ColonneDataTable } from "@/components/ui/data-table";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";
import { useColonnesTransaction } from "@/features/paiements/components/colonnes-transaction";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type Action = "confirmer" | "annuler";

export default function AdminPaiementsPage() {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const { argent } = useFormats();
  const { methodePaiement } = useLabels();
  const colonnesTransaction = useColonnesTransaction();
  const toast = useToast();

  // `donnees` est conservé pendant un rechargement : après une action la
  // liste reste affichée au lieu de repasser par un écran de chargement.
  const { donnees, chargement, erreur, recharger } = useApiList(() =>
    api.get<Transaction[]>("/paiements"),
  );
  const transactions = useMemo(() => donnees ?? [], [donnees]);

  // Transaction dont une requête est réellement en cours.
  const [enCours, setEnCours] = useState<string | null>(null);
  // Action sensible en attente de confirmation explicite.
  const [aConfirmer, setAConfirmer] = useState<{
    transaction: Transaction;
    action: Action;
  } | null>(null);

  const enAttente = useMemo(
    () => transactions.filter((x) => x.statut === "en_attente"),
    [transactions],
  );
  const traitees = useMemo(
    () => transactions.filter((x) => x.statut !== "en_attente"),
    [transactions],
  );

  /**
   * Confirme ou annule un paiement. Le succès n'est annoncé qu'après la
   * réponse positive du backend ; sinon le message d'erreur du backend est
   * affiché et la liste n'est pas modifiée.
   */
  async function executer(transaction: Transaction, action: Action) {
    setEnCours(transaction.id);
    try {
      await api.patch(`/paiements/${transaction.id}/${action}`);
      toast.succes(
        t(action === "confirmer" ? "adminList.confirmedToast" : "adminList.cancelledToast"),
      );
      await recharger();
    } catch (err) {
      toast.erreur(
        t("adminList.genericError"),
        err instanceof ApiError ? err.message : undefined,
      );
    } finally {
      setEnCours(null);
      setAConfirmer(null);
    }
  }

  const premierChargement = chargement && donnees === null;

  const colonnesAVerifier: ColonneDataTable<Transaction>[] = [
    // Statut omis : toutes ces lignes sont en attente, le titre le dit déjà.
    ...colonnesTransaction.filter((colonne) => colonne.id !== "statut"),
    {
      id: "actions",
      entete: t("table.colActions"),
      cellule: (x) => {
        // Un paiement en ligne (Papi / MVola) est vérifié par le fournisseur :
        // le backend refuse toute action manuelle, l'interface ne propose
        // donc aucun bouton dans ce cas.
        const enLigne = x.provider === "papi" || x.provider === "mvola";
        return enLigne ? (
          <p className="min-w-48 max-w-64 text-xs leading-relaxed text-ink-soft">
            {t("adminList.onlineAuto")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={enCours === x.id && aConfirmer?.action === "confirmer"}
              disabled={enCours !== null}
              onClick={() => setAConfirmer({ transaction: x, action: "confirmer" })}
            >
              {t("adminList.confirm")}
            </Button>
            <Button
              size="sm"
              variant="danger-ghost"
              disabled={enCours !== null}
              onClick={() => setAConfirmer({ transaction: x, action: "annuler" })}
            >
              {t("adminList.cancel")}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-4">
      </div>

      <PageHeader
        icon={Wallet}
        eyebrow={t("adminList.eyebrow")}
        title={t("adminList.title")}
      />

      {erreur && (
        <NoticeCard className="mb-4 flex flex-wrap items-center justify-between gap-3 border-brique/30">
          <p role="alert" className="text-sm text-brique">
            {erreur}
          </p>
          <Button
            size="sm"
            variant="ghost"
            loading={chargement}
            onClick={() => void recharger()}
          >
            {tc("actions.retry")}
          </Button>
        </NoticeCard>
      )}

      {premierChargement ? (
        <ChargementPaiements />
      ) : (
        <>
          {/* ------------------------------------------- À VÉRIFIER */}
          <h2 className="mb-3 font-display text-lg font-semibold">
            {t("adminList.toVerify", { count: enAttente.length })}
          </h2>

          <div className="mb-8">
            <DataTable
              lignes={enAttente}
              colonnes={colonnesAVerifier}
              cleLigne={(x) => x.id}
              legende={t("adminList.toVerify", { count: enAttente.length })}
              iconeVide={Wallet}
              messageVide={t("adminList.noneToVerify")}
              messageAucunResultat={t("table.noResults")}
              placeholderRecherche={t("table.searchPlaceholder")}
              libelleRecherche={t("table.searchLabel")}
            />
          </div>

          {/* ------------------------------------------- HISTORIQUE */}
          <h2 className="mb-3 font-display text-lg font-semibold">
            {t("adminList.history")}
          </h2>

          <DataTable
            lignes={traitees}
            colonnes={colonnesTransaction}
            cleLigne={(x) => x.id}
            legende={t("adminList.history")}
            iconeVide={Wallet}
            messageVide={tc("states.empty")}
            messageAucunResultat={t("table.noResults")}
            placeholderRecherche={t("table.searchPlaceholder")}
            libelleRecherche={t("table.searchLabel")}
            triInitial={{ colonne: "date", direction: "desc" }}
          />
        </>
      )}

      {/* Valider ou annuler un paiement est irréversible côté backend
          (« Ce paiement a déjà été traité ») : confirmation obligatoire. */}
      <ConfirmDialog
        ouvert={aConfirmer !== null}
        titre={
          aConfirmer?.action === "annuler"
            ? t("adminList.cancelTitle")
            : t("adminList.confirmTitle")
        }
        description={
          aConfirmer
            ? t(
                aConfirmer.action === "annuler"
                  ? "adminList.cancelDescription"
                  : "adminList.confirmDescription",
                {
                  montant: argent(aConfirmer.transaction.montant),
                  methode: methodePaiement(aConfirmer.transaction.methode),
                  reference: aConfirmer.transaction.reference,
                },
              )
            : undefined
        }
        libelleConfirmer={
          aConfirmer?.action === "annuler"
            ? t("adminList.cancelAction")
            : t("adminList.confirmAction")
        }
        destructif={aConfirmer?.action === "annuler"}
        enCours={aConfirmer !== null && enCours === aConfirmer.transaction.id}
        onConfirmer={() => {
          if (aConfirmer) void executer(aConfirmer.transaction, aConfirmer.action);
        }}
        onAnnuler={() => setAConfirmer(null)}
      />
    </div>
  );
}

function ChargementPaiements() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-3 h-5 w-40" />
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="notice-card flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-8 w-44" />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";

import type { ColonneDataTable } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/Notice";
import { toneParStatut } from "@/features/paiements/utils/paiements";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import type { Transaction } from "@/types/paiements";

/**
 * Colonnes communes aux tableaux de paiements (administration et compte
 * utilisateur). Chaque page y ajoute ses propres actions.
 */
export function useColonnesTransaction(): ColonneDataTable<Transaction>[] {
  const t = useTranslations("payments");
  const tTable = useTranslations("payments.table");
  const { argent, dateCourte } = useFormats();
  const { methodePaiement, statutTransaction } = useLabels();

  const titre = (x: Transaction) =>
    x.candidature?.mission?.titre ?? t("page.mission");
  const moyen = (x: Transaction) => {
    const libelle = methodePaiement(x.methode);
    const fournisseur = x.methodeFournisseur ? ` (${x.methodeFournisseur})` : "";
    const enLigne =
      x.provider === "mvola" || x.provider === "papi"
        ? ` · ${t("page.online")}`
        : "";
    return `${libelle}${fournisseur}${enLigne}`;
  };
  const statut = (x: Transaction) => (
    <Tag tone={toneParStatut[x.statut]}>{statutTransaction(x.statut)}</Tag>
  );

  return [
    {
      id: "mission",
      entete: t("table.colMission"),
      valeurTri: titre,
      texteRecherche: (x) =>
        `${titre(x)} ${x.reference} ${x.client?.nom ?? ""} ${x.etudiant?.nom ?? ""}`,
      classeCellule: "min-w-44",
      cellule: (x) => (
        <>
          <span className="block font-display font-medium text-ink">
            {titre(x)}
          </span>
          {/* Les colonnes masquées passent sous le titre. */}
          <span className="mt-0.5 block text-xs text-ink-soft xl:hidden">
            {moyen(x)} · {t("page.ref")} {x.reference}
            <span className="md:hidden"> · {dateCourte(x.dateCreation)}</span>
          </span>
          <span className="mt-1 block whitespace-nowrap sm:hidden">{statut(x)}</span>
          <details className="mt-1 text-xs">
            <summary className="w-fit cursor-pointer text-ink-soft underline underline-offset-2 hover:text-ink">
              {tTable("details")}
            </summary>
            <dl className="mt-2 grid gap-x-3 gap-y-1 text-ink-soft sm:grid-cols-2">
              <div>
                <dt className="inline font-medium">{tTable("detailMission")}: </dt>
                <dd className="inline">{titre(x)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">{tTable("detailReference")}: </dt>
                <dd className="inline font-mono">{x.reference}</dd>
              </div>
              {x.client?.nom && (
                <div>
                  <dt className="inline font-medium">{tTable("detailClient")}: </dt>
                  <dd className="inline">{x.client.nom}</dd>
                </div>
              )}
              {x.etudiant?.nom && (
                <div>
                  <dt className="inline font-medium">{tTable("detailStudent")}: </dt>
                  <dd className="inline">{x.etudiant.nom}</dd>
                </div>
              )}
              <div>
                <dt className="inline font-medium">{tTable("detailMethod")}: </dt>
                <dd className="inline">{moyen(x)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">{tTable("detailStatus")}: </dt>
                <dd className="inline">{statutTransaction(x.statut)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">{tTable("detailDate")}: </dt>
                <dd className="inline">{dateCourte(x.dateCreation)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">{tTable("detailAmount")}: </dt>
                <dd className="inline">{argent(x.montant)}</dd>
              </div>
            </dl>
          </details>
        </>
      ),
    },
    {
      id: "moyen",
      entete: t("table.colMethod"),
      masquerSous: "xl",
      classeCellule: "text-xs text-ink-soft",
      valeurTri: moyen,
      texteRecherche: moyen,
      cellule: moyen,
    },
    {
      id: "reference",
      entete: t("table.colReference"),
      masquerSous: "xl",
      classeCellule: "font-mono text-xs text-ink-soft",
      valeurTri: (x) => x.reference,
      cellule: (x) => x.reference,
    },
    {
      id: "date",
      entete: t("table.colDate"),
      masquerSous: "md",
      classeCellule: "whitespace-nowrap text-xs tabular-nums text-ink-soft",
      valeurTri: (x) => new Date(x.dateCreation),
      cellule: (x) => dateCourte(x.dateCreation),
    },
    {
      id: "montant",
      entete: t("table.colAmount"),
      alignement: "droite",
      classeCellule: "whitespace-nowrap tabular-nums font-medium text-ocre-dark",
      valeurTri: (x) => Number(x.montant),
      cellule: (x) => argent(x.montant),
    },
    {
      id: "statut",
      entete: t("table.colStatus"),
      masquerSous: "sm",
      classeCellule: "whitespace-nowrap",
      valeurTri: (x) => statutTransaction(x.statut),
      texteRecherche: (x) => statutTransaction(x.statut),
      cellule: statut,
    },
  ];
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Facture } from "@/types/paiements";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";

import { DataTable, type ColonneDataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/Notice";
import {
  FILTRES_FINANCIERS_VIDES,
  FiltresFinanciers,
  type ValeursFiltresFinanciers,
} from "@/features/paiements/components/FiltresFinanciers";
import {
  filtrerFinancier,
  filtresFinanciersActifs,
} from "@/features/paiements/utils/filtrer-financier";

export default function FacturesPage() {
  const { utilisateur } = useAuth();
  const t = useTranslations("invoices");
  const { argent, date } = useFormats();
  const { methodePaiement } = useLabels();

  const [factures, setFactures] = useState<Facture[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtres, setFiltres] = useState<ValeursFiltresFinanciers>({
    ...FILTRES_FINANCIERS_VIDES,
  });

  useEffect(() => {
    if (!utilisateur) return;
    let actif = true;

    async function charger() {
      try {
        const data = await api.get<Facture[]>("/factures");
        if (actif) setFactures(data);
      } catch (err) {
        if (actif) {
          setErreur(
            err instanceof ApiError
              ? err.message
              : t("list.loadError"),
          );
        }
      } finally {
        if (actif) setChargement(false);
      }
    }

    void charger();
    return () => {
      actif = false;
    };
  }, [utilisateur, t]);

  const facturesFiltrees = useMemo(
    () =>
      filtrerFinancier(factures, filtres, {
        methode: (facture) => facture.methode,
        date: (facture) => facture.dateEmission,
      }),
    [factures, filtres],
  );

  // Après tous les hooks : leur ordre ne doit jamais dépendre de la session.
  if (!utilisateur) return null;

  const estEtudiant = utilisateur.role === "etudiant";
  const tiers = (f: Facture) => (estEtudiant ? f.clientNom : f.etudiantNom);

  const colonnes: ColonneDataTable<Facture>[] = [
    {
      id: "facture",
      entete: t("list.colInvoice"),
      valeurTri: (f) => f.numero,
      texteRecherche: (f) =>
        `${f.numero} ${f.referencePaiement} ${f.titreMission}`,
      cellule: (f) => (
        <Link
          href={`/tableau-de-bord/paiements/${f.transactionId}/facture`}
          className="block min-w-0 hover:underline"
        >
          <span className="block font-mono text-xs text-ink-soft">{f.numero}</span>
          <span className="block font-display font-medium text-ink">
            {f.titreMission}
          </span>
          {/* Sur mobile, les colonnes masquées passent sous le titre. */}
          <span className="block text-xs text-ink-soft sm:hidden">
            {estEtudiant
              ? t("list.paidBy", { nom: f.clientNom })
              : t("list.provider", { nom: f.etudiantNom })}
            {" · "}
            {methodePaiement(f.methode)}
            {" · "}
            {date(f.dateEmission)}
          </span>
        </Link>
      ),
    },
    {
      id: "tiers",
      entete: estEtudiant ? t("list.colClient") : t("list.colProvider"),
      masquerSous: "sm",
      classeCellule: "text-xs text-ink-soft",
      valeurTri: tiers,
      texteRecherche: tiers,
      cellule: tiers,
    },
    {
      id: "moyen",
      entete: t("list.colMethod"),
      masquerSous: "sm",
      classeCellule: "text-xs text-ink-soft",
      valeurTri: (f) => methodePaiement(f.methode),
      texteRecherche: (f) => methodePaiement(f.methode),
      cellule: (f) => methodePaiement(f.methode),
    },
    {
      id: "date",
      entete: t("list.colDate"),
      masquerSous: "sm",
      classeCellule: "whitespace-nowrap text-xs tabular-nums text-ink-soft",
      valeurTri: (f) => new Date(f.dateEmission),
      cellule: (f) => date(f.dateEmission),
    },
    {
      id: "montant",
      entete: t("list.colAmount"),
      alignement: "droite",
      classeCellule: "whitespace-nowrap tabular-nums font-medium text-ink",
      valeurTri: (f) => Number(f.montant),
      cellule: (f) => argent(f.montant),
    },
  ];

  return (
    <div>
      <div className="mb-4">
      </div>

      <PageHeader
        icon={FileText}
        eyebrow={t("list.eyebrow")}
        title={t("list.title")}
      />

      <p className="mb-5 text-sm text-ink-soft">
        {estEtudiant ? t("list.introStudent") : t("list.introClient")}
      </p>

      <DataTable
        lignes={facturesFiltrees}
        colonnes={colonnes}
        cleLigne={(f) => f.id}
        legende={t("list.title")}
        chargement={chargement}
        erreur={erreur}
        iconeVide={FileText}
        messageVide={t("list.empty")}
        messageAucunResultat={t("list.noResults")}
        placeholderRecherche={t("list.searchPlaceholder")}
        libelleRecherche={t("list.searchLabel")}
        filtres={<FiltresFinanciers valeur={filtres} onChange={setFiltres} />}
        filtresActifs={filtresFinanciersActifs(filtres)}
        onReinitialiserFiltres={() =>
          setFiltres({ ...FILTRES_FINANCIERS_VIDES })
        }
        cleFiltres={JSON.stringify(filtres)}
      />
    </div>
  );
}

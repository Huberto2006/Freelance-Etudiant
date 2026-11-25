"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, ChevronsUpDown, SearchX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EtatVide, NoticeCard } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import {
  TAILLE_PAGE_DEFAUT,
  type ColonneDataTable,
  type DataTableProps,
  type EtatTri,
} from "./types";
import { calculerPagination, filtrerLignes, trierLignes } from "./utils";

const DELAI_RECHERCHE_MS = 250;
const LIGNES_SQUELETTE = 6;

const classesMasquage = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  xl: "hidden xl:table-cell",
};

function classesColonne<T>(colonne: ColonneDataTable<T>) {
  return clsx(
    "px-4",
    colonne.alignement === "droite" && "text-right",
    colonne.masquerSous && classesMasquage[colonne.masquerSous],
  );
}

/**
 * Tableau de données commun : recherche, tri et pagination côté client, sur
 * des lignes déjà chargées. Les filtres métier restent dans la page, qui passe
 * ses lignes filtrées et décrit ses filtres par `cleFiltres`.
 *
 * Aucune API de tableau ne renvoie encore de total : la pagination serveur
 * n'a donc pas de contrat sur lequel s'appuyer.
 */
export function DataTable<T>({
  lignes,
  colonnes,
  cleLigne,
  legende,
  chargement = false,
  masquerVide = false,
  erreur,
  onReessayer,
  reessaiEnCours = false,
  iconeVide,
  messageVide,
  messageAucunResultat,
  placeholderRecherche,
  libelleRecherche,
  filtres,
  filtresActifs = false,
  onReinitialiserFiltres,
  cleFiltres = "",
  triInitial,
}: DataTableProps<T>) {
  const t = useTranslations("common");
  const locale = useLocale();

  const [taillePage, setTaillePage] = useState(TAILLE_PAGE_DEFAUT);
  const [saisie, setSaisie] = useState("");
  const [terme, setTerme] = useState("");
  const [tri, setTri] = useState<EtatTri | undefined>(triInitial);

  useEffect(() => {
    const minuteur = setTimeout(() => setTerme(saisie), DELAI_RECHERCHE_MS);
    return () => clearTimeout(minuteur);
  }, [saisie]);

  // La page n'est valable que pour une combinaison donnée de critères : tout
  // changement (recherche, tri, taille, filtre) ramène donc à la première page.
  const criteres = JSON.stringify([terme, tri, taillePage, cleFiltres]);
  const [position, setPosition] = useState({ criteres, page: 1 });
  // Réinitialisation effective : sans elle, revenir à des critères déjà vus
  // (limite 10 → 20 → 10, recherche effacée) restaurerait l'ancienne page.
  if (position.criteres !== criteres) {
    setPosition({ criteres, page: 1 });
  }
  const pageDemandee = position.criteres === criteres ? position.page : 1;

  const trouvees = useMemo(() => {
    const filtrees = filtrerLignes(
      lignes,
      terme,
      colonnes.flatMap((c) => (c.texteRecherche ? [c.texteRecherche] : [])),
    );
    const valeur = colonnes.find((c) => c.id === tri?.colonne)?.valeurTri;
    return tri && valeur
      ? trierLignes(filtrees, valeur, tri.direction, locale)
      : filtrees;
  }, [lignes, terme, colonnes, tri, locale]);

  const pagination = calculerPagination(trouvees.length, pageDemandee, taillePage);
  const visibles = trouvees.slice(pagination.debut, pagination.fin);

  const criteresActifs = saisie !== "" || filtresActifs;

  function changerTri(colonne: string) {
    setTri((actuel) => {
      if (actuel?.colonne !== colonne) return { colonne, direction: "asc" };
      return actuel.direction === "asc" ? { colonne, direction: "desc" } : undefined;
    });
  }

  function reinitialiser() {
    setSaisie("");
    setTerme("");
    onReinitialiserFiltres?.();
  }

  const blocErreur = erreur ? (
    <NoticeCard className="mb-4 flex flex-wrap items-center justify-between gap-3 border-brique/30">
      <p role="alert" className="text-sm text-brique">
        {erreur}
      </p>
      {onReessayer && (
        <Button
          size="sm"
          variant="ghost"
          loading={reessaiEnCours}
          onClick={onReessayer}
        >
          {t("actions.retry")}
        </Button>
      )}
    </NoticeCard>
  ) : null;

  if (chargement && lignes.length === 0 && !criteresActifs) {
    return <DataTableSquelette colonnes={colonnes} />;
  }

  if (masquerVide && lignes.length === 0 && !criteresActifs) return null;

  if (lignes.length === 0 && !criteresActifs) {
    return (
      blocErreur ?? <EtatVide icon={iconeVide}>{messageVide}</EtatVide>
    );
  }

  return (
    <div>
      {blocErreur}

      <DataTableToolbar
        taillePage={taillePage}
        onTaillePage={setTaillePage}
        recherche={saisie}
        onRecherche={setSaisie}
        placeholderRecherche={placeholderRecherche}
        libelleRecherche={libelleRecherche}
        filtres={filtres}
        filtresActifs={filtresActifs}
        reinitialisable={criteresActifs}
        onReinitialiser={reinitialiser}
      />

      {trouvees.length === 0 ? (
        <EtatVide icon={SearchX}>{messageAucunResultat}</EtatVide>
      ) : (
        <>
          <div className="notice-card overflow-hidden p-0">
            {/* Focusable : le défilement horizontal reste possible au clavier. */}
            <div
              role="region"
              aria-label={legende}
              tabIndex={0}
              className="overflow-x-auto"
            >
              <table className="w-full min-w-[22rem] border-collapse text-sm">
                <caption className="sr-only">{legende}</caption>
                <thead>
                  <tr className="border-b border-ink/10 bg-ink/[0.03] text-left text-xs text-ink-soft">
                    {colonnes.map((colonne) => {
                      const direction =
                        tri?.colonne === colonne.id ? tri.direction : undefined;
                      const IconeTri =
                        direction === "asc"
                          ? ArrowUp
                          : direction === "desc"
                            ? ArrowDown
                            : ChevronsUpDown;
                      return (
                        <th
                          key={colonne.id}
                          scope="col"
                          aria-sort={
                            !colonne.valeurTri
                              ? undefined
                              : direction === "asc"
                                ? "ascending"
                                : direction === "desc"
                                  ? "descending"
                                  : "none"
                          }
                          className={clsx(classesColonne(colonne), "whitespace-nowrap py-2.5 font-medium")}
                        >
                          {colonne.valeurTri ? (
                            <button
                              type="button"
                              onClick={() => changerTri(colonne.id)}
                              className={clsx(
                                "inline-flex cursor-pointer items-center gap-1 font-medium transition-colors hover:text-ink pointer-coarse:min-h-11",
                                direction && "text-ink",
                              )}
                            >
                              {colonne.entete}
                              <IconeTri
                                size={14}
                                aria-hidden="true"
                                className={direction ? undefined : "opacity-50"}
                              />
                            </button>
                          ) : (
                            colonne.entete
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-ink/10">
                  {visibles.map((ligne) => (
                    <tr
                      key={cleLigne(ligne)}
                      className="transition-colors hover:bg-ink/[0.02]"
                    >
                      {colonnes.map((colonne) => (
                        <td
                          key={colonne.id}
                          className={clsx(
                            classesColonne(colonne),
                            "py-3",
                            colonne.classeCellule,
                          )}
                        >
                          {colonne.cellule(ligne)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DataTablePagination
            pagination={pagination}
            onPage={(page) => setPosition({ criteres, page })}
          />
        </>
      )}
    </div>
  );
}

function DataTableSquelette<T>({ colonnes }: { colonnes: ColonneDataTable<T>[] }) {
  return (
    <div aria-hidden="true" className="notice-card overflow-hidden p-0">
      <table className="w-full border-collapse">
        <tbody className="divide-y divide-ink/10">
          {Array.from({ length: LIGNES_SQUELETTE }).map((_, ligne) => (
            <tr key={ligne}>
              {colonnes.map((colonne) => (
                <td key={colonne.id} className={clsx(classesColonne(colonne), "py-3.5")}>
                  <Skeleton
                    className={clsx(
                      "h-3.5 w-full max-w-40",
                      colonne.alignement === "droite" && "ml-auto",
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

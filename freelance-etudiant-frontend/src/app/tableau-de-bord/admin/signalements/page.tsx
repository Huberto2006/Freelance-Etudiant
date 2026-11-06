"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Signalement } from "@/types/signalements";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useApiList } from "@/hooks/useApiList";
import { Button } from "@/components/ui/Button";
import { DataTable, type ColonneDataTable } from "@/components/ui/data-table";
import {
  FiltrePeriode,
  type PeriodeFiltre,
} from "@/components/ui/data-table/FiltrePeriode";
import { dateDansPeriode } from "@/components/ui/data-table/utils";
import { Textarea } from "@/components/ui/Field";
import { BadgeStatut, EtatVide, NoticeCard, PageHeader } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

export default function AdminSignalementsPage() {
  const t = useTranslations("admin");
  const { dateCourte } = useFormats();
  const { statutSignalement } = useLabels();
  const tc = useTranslations("common");
  const toast = useToast();
  const { donnees, chargement, erreur, recharger } = useApiList(() =>
    api.get<Signalement[]>("/signalements"),
  );
  const signalements = useMemo(() => donnees ?? [], [donnees]);
  const [periode, setPeriode] = useState<PeriodeFiltre>({
    depuis: "",
    jusqua: "",
  });
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);

  /**
   * Marque un signalement comme traité. Le succès n'est annoncé qu'après la
   * réponse positive du backend.
   */
  async function traiter(id: string) {
    setEnCours(id);
    try {
      await api.patch(`/signalements/${id}/traiter`, {
        resolution: resolutions[id] || undefined,
      });
      toast.succes(t("reports.processedToast"));
      await recharger();
    } catch (err) {
      toast.erreur(
        t("reports.genericError"),
        err instanceof ApiError ? err.message : undefined,
      );
    } finally {
      setEnCours(null);
    }
  }

  const premierChargement = chargement && donnees === null;

  const ouverts = signalements.filter((x) => x.statut !== "traite");
  const traites = signalements.filter(
    (x) =>
      x.statut === "traite" &&
      ((!periode.depuis && !periode.jusqua) ||
        dateDansPeriode(x.dateSignalement, periode.depuis, periode.jusqua)),
  );

  const colonnesTraites: ColonneDataTable<Signalement>[] = [
    {
      id: "motif",
      entete: t("reports.colReason"),
      valeurTri: (s) => s.motif,
      texteRecherche: (s) => `${s.motif} ${s.description}`,
      classeCellule: "min-w-44",
      cellule: (s) => (
        <>
          <span className="block font-display font-medium text-ink">{s.motif}</span>
          <span className="block max-w-xl text-xs leading-relaxed text-ink-soft">
            {s.description}
          </span>
          <details className="mt-1 text-xs">
            <summary className="w-fit cursor-pointer text-ink-soft underline underline-offset-2 hover:text-ink">
              {t("reports.viewDetails")}
            </summary>
            <dl className="mt-2 grid gap-x-3 gap-y-1 text-ink-soft sm:grid-cols-2">
              <div>
                <dt className="inline font-medium">{t("reports.detailTargetId")}: </dt>
                <dd className="inline break-all font-mono">{s.cibleId}</dd>
              </div>
              {s.signalePar && (
                <div>
                  <dt className="inline font-medium">{t("reports.detailReporter")}: </dt>
                  <dd className="inline">{s.signalePar.nom}</dd>
                </div>
              )}
              {s.signalePar?.email && (
                <div>
                  <dt className="inline font-medium">{t("reports.detailReporterEmail")}: </dt>
                  <dd className="inline">{s.signalePar.email}</dd>
                </div>
              )}
              {s.dateTraitement && (
                <div>
                  <dt className="inline font-medium">{t("reports.detailProcessedOn")}: </dt>
                  <dd className="inline">{dateCourte(s.dateTraitement)}</dd>
                </div>
              )}
            </dl>
          </details>
          {/* Sur petit écran, les colonnes masquées passent sous le texte. */}
          {s.resolution && (
            <span className="mt-1 block text-xs italic text-ink-soft md:hidden">
              {t("reports.resolution", { text: s.resolution })}
            </span>
          )}
          <span className="mt-1 block text-xs tabular-nums text-ink-soft md:hidden">
            {s.cibleType} · {dateCourte(s.dateSignalement)}
          </span>
        </>
      ),
    },
    {
      id: "resolution",
      entete: t("reports.colResolution"),
      masquerSous: "md",
      classeCellule: "max-w-xs text-xs italic text-ink-soft",
      texteRecherche: (s) => s.resolution ?? "",
      cellule: (s) => s.resolution,
    },
    {
      id: "cible",
      entete: t("reports.colTarget"),
      masquerSous: "md",
      classeCellule: "text-xs text-ink-soft",
      valeurTri: (s) => s.cibleType,
      texteRecherche: (s) => s.cibleType,
      cellule: (s) => s.cibleType,
    },
    {
      id: "date",
      entete: t("reports.colDate"),
      masquerSous: "md",
      classeCellule: "whitespace-nowrap text-xs tabular-nums text-ink-soft",
      valeurTri: (s) => new Date(s.dateSignalement),
      cellule: (s) => dateCourte(s.dateSignalement),
    },
    {
      id: "statut",
      entete: t("reports.colStatus"),
      classeCellule: "whitespace-nowrap",
      cellule: (s) => (
        <BadgeStatut
          statut={s.statut}
          labels={{ [s.statut]: statutSignalement(s.statut) }}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
      </div>

      <PageHeader icon={Flag} eyebrow={t("eyebrow")} title={t("reports.title")} />

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
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="notice-card flex flex-col gap-2 p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold">
            {t("reports.toProcess", { count: ouverts.length })}
          </h2>

          {erreur && ouverts.length === 0 ? null : ouverts.length === 0 ? (
            <EtatVide icon={Flag} className="mb-8">
              {t("reports.noneWaiting")}
            </EtatVide>
          ) : (
            <ul className="mb-8 flex flex-col gap-3">
              {ouverts.map((s) => {
                const idChamp = `resolution-${s.id}`;
                return (
                  <li key={s.id}>
                    <NoticeCard className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display font-medium leading-snug">
                          {s.motif}
                        </p>
                        <BadgeStatut
                          statut={s.statut}
                          labels={{ [s.statut]: statutSignalement(s.statut) }}
                        />
                      </div>
                      <p className="text-sm leading-relaxed text-ink-soft">
                        {s.description}
                      </p>
                      <p className="text-xs tabular-nums text-ink-soft">
                        {s.cibleType} · {dateCourte(s.dateSignalement)}
                      </p>

                      <label htmlFor={idChamp} className="sr-only">
                        {t("reports.resolutionPlaceholder")}
                      </label>
                      <Textarea
                        id={idChamp}
                        rows={2}
                        placeholder={t("reports.resolutionPlaceholder")}
                        value={resolutions[s.id] ?? ""}
                        disabled={enCours === s.id}
                        onChange={(e) =>
                          setResolutions((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="self-start"
                        loading={enCours === s.id}
                        disabled={enCours !== null}
                        onClick={() => void traiter(s.id)}
                      >
                        {t("reports.markProcessed")}
                      </Button>
                    </NoticeCard>
                  </li>
                );
              })}
            </ul>
          )}

          <h2 className="mb-3 font-display text-lg font-semibold">
            {t("reports.processed")}
          </h2>
          <DataTable
          masquerVide={Boolean(erreur)}
            lignes={traites}
            colonnes={colonnesTraites}
            cleLigne={(s) => s.id}
            legende={t("reports.processed")}
            iconeVide={Flag}
            messageVide={tc("states.empty")}
            messageAucunResultat={t("reports.noResults")}
            placeholderRecherche={t("reports.searchPlaceholder")}
            libelleRecherche={t("reports.searchLabel")}
            filtres={
              <FiltrePeriode valeur={periode} onChange={setPeriode} />
            }
            filtresActifs={Boolean(periode.depuis || periode.jusqua)}
            onReinitialiserFiltres={() =>
              setPeriode({ depuis: "", jusqua: "" })
            }
            cleFiltres={`${periode.depuis}|${periode.jusqua}`}
            triInitial={{ colonne: "date", direction: "desc" }}
          />
        </>
      )}
    </div>
  );
}

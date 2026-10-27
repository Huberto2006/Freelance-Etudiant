"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Signalement } from "@/lib/types";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useApiList } from "@/hooks/useApiList";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { BadgeStatut, EtatVide, NoticeCard, PageHeader } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

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
  const traites = signalements.filter((x) => x.statut === "traite");

  return (
    <div>
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord/admin" forcer />
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

          {ouverts.length === 0 ? (
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
          {traites.length === 0 ? (
            <EtatVide icon={Flag}>{tc("states.empty")}</EtatVide>
          ) : (
            <ul className="flex flex-col gap-3">
              {traites.map((s) => (
                <li key={s.id}>
                  <NoticeCard className="flex flex-col gap-1.5">
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
                    {s.resolution && (
                      <p className="text-xs italic text-ink-soft">
                        {t("reports.resolution", { text: s.resolution })}
                      </p>
                    )}
                  </NoticeCard>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

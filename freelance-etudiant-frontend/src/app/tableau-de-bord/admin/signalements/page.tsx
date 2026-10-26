"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Signalement } from "@/lib/types";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

const toneParStatut: Record<string, "ocre" | "rice" | "brique" | "ink"> = {
  ouvert: "brique",
  en_cours: "ocre",
  traite: "rice",
};

export default function AdminSignalementsPage() {
  const t = useTranslations("admin");
  const { dateCourte } = useFormats();
  const { statutSignalement } = useLabels();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(() => {
    setChargement(true);
    api
      .get<Signalement[]>("/signalements")
      .then(setSignalements)
      .finally(() => setChargement(false));
  }, []);

  useEffect(() => {
    // Differre l'appel hors du corps synchrone de l'effet (react-hooks/
    // set-state-in-effect) : charger() met a jour l'etat des son entree.
    void Promise.resolve().then(() => {
      charger();
    });
  }, [charger]);

  async function traiter(id: string) {
    setEnCours(id);
    setErreur(null);
    try {
      await api.patch(`/signalements/${id}/traiter`, {
        resolution: resolutions[id] || undefined,
      });
      charger();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("reports.genericError"));
    } finally {
      setEnCours(null);
    }
  }

  const ouverts = signalements.filter((s) => s.statut !== "traite");
  const traites = signalements.filter((s) => s.statut === "traite");

  return (
    <div>
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord/admin" forcer />
      </div>

      <PageHeader icon={Flag} eyebrow={t("eyebrow")} title={t("reports.title")} />
      {erreur && <p className="text-sm text-brique mb-4">{erreur}</p>}

      {chargement ? (
        <p className="text-sm text-ink-soft">{t("reports.loading")}</p>
      ) : (
        <>
          <h2 className="font-display text-lg font-semibold mb-3">
            {t("reports.toProcess", { count: ouverts.length })}
          </h2>
          {ouverts.length === 0 ? (
            <NoticeCard className="mb-7">
              <p className="text-sm text-ink-soft/70">{t("reports.noneWaiting")}</p>
            </NoticeCard>
          ) : (
            <div className="flex flex-col gap-3 mb-7">
              {ouverts.map((s) => (
                <NoticeCard key={s.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-medium">{s.motif}</p>
                    <Tag tone={toneParStatut[s.statut]}>
                      {statutSignalement(s.statut)}
                    </Tag>
                  </div>
                  <p className="text-sm text-ink-soft">{s.description}</p>
                  <p className="text-xs text-ink-soft/60 font-mono">
                    {s.cibleType} · {dateCourte(s.dateSignalement)}
                  </p>
                  <Textarea
                    rows={2}
                    placeholder={t("reports.resolutionPlaceholder")}
                    value={resolutions[s.id] ?? ""}
                    onChange={(e) =>
                      setResolutions((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                  />
                  <Button
                    variant="secondary"
                    className="self-start"
                    disabled={enCours === s.id}
                    onClick={() => traiter(s.id)}
                  >
                    {t("reports.markProcessed")}
                  </Button>
                </NoticeCard>
              ))}
            </div>
          )}

          <h2 className="font-display text-lg font-semibold mb-3">{t("reports.processed")}</h2>
          <div className="flex flex-col gap-3">
            {traites.map((s) => (
              <NoticeCard key={s.id} className="flex flex-col gap-1.5">
                <p className="font-display font-medium">{s.motif}</p>
                <p className="text-sm text-ink-soft">{s.description}</p>
                {s.resolution && (
                  <p className="text-xs text-ink-soft/70 italic">
                    {t("reports.resolution", { text: s.resolution })}
                  </p>
                )}
              </NoticeCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

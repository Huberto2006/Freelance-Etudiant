"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Signalement } from "@/lib/types";
import { formatDateCourte, statutSignalementLabel } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";

const toneParStatut: Record<string, "ocre" | "rice" | "brique" | "ink"> = {
  ouvert: "brique",
  en_cours: "ocre",
  traite: "rice",
};

export default function AdminSignalementsPage() {
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
      setErreur(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setEnCours(null);
    }
  }

  const ouverts = signalements.filter((s) => s.statut !== "traite");
  const traites = signalements.filter((s) => s.statut === "traite");

  return (
    <div>
      <PageHeader icon={Flag} eyebrow="Administration" title="Signalements" />
      {erreur && <p className="text-sm text-brique mb-4">{erreur}</p>}

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : (
        <>
          <h2 className="font-display text-lg font-semibold mb-3">
            À traiter ({ouverts.length})
          </h2>
          {ouverts.length === 0 ? (
            <NoticeCard className="mb-8">
              <p className="text-sm text-ink-soft/70">Aucun signalement en attente.</p>
            </NoticeCard>
          ) : (
            <div className="flex flex-col gap-3 mb-8">
              {ouverts.map((s) => (
                <NoticeCard key={s.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-medium">{s.motif}</p>
                    <Tag tone={toneParStatut[s.statut]}>
                      {statutSignalementLabel[s.statut]}
                    </Tag>
                  </div>
                  <p className="text-sm text-ink-soft">{s.description}</p>
                  <p className="text-xs text-ink-soft/60 font-mono">
                    {s.cibleType} · {formatDateCourte(s.dateSignalement)}
                  </p>
                  <Textarea
                    rows={2}
                    placeholder="Note de résolution (optionnel)…"
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
                    Marquer comme traité
                  </Button>
                </NoticeCard>
              ))}
            </div>
          )}

          <h2 className="font-display text-lg font-semibold mb-3">Traités</h2>
          <div className="flex flex-col gap-3">
            {traites.map((s) => (
              <NoticeCard key={s.id} className="flex flex-col gap-1.5">
                <p className="font-display font-medium">{s.motif}</p>
                <p className="text-sm text-ink-soft">{s.description}</p>
                {s.resolution && (
                  <p className="text-xs text-ink-soft/70 italic">
                    Résolution : {s.resolution}
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

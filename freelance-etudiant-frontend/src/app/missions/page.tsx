"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Mission } from "@/lib/types";
import { formatArgent, formatDate } from "@/lib/format";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { BarreRecherche, type Filtres } from "@/components/ui/BarreRecherche";

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async (filtres: Filtres = {}) => {
    setChargement(true);
    const params = new URLSearchParams();
    if (filtres.motsCles) params.set("motsCles", filtres.motsCles);
    if (filtres.categorie) params.set("categorie", filtres.categorie);
    if (filtres.competence) params.set("competence", filtres.competence);
    try {
      const data = await api.get<Mission[]>(`/missions?${params.toString()}`, {
        auth: false,
      });
      setMissions(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-rice mb-3">
        Panneau d&apos;affichage
      </p>
      <h1 className="font-display text-4xl font-semibold mb-8">Missions</h1>

      <BarreRecherche
        onFiltrer={charger}
        placeholder="Développement, design, rédaction…"
      />

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : missions.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Aucune mission ne correspond à ces critères pour le moment.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {missions.map((mission) => (
            <Link key={mission.id} href={`/missions/${mission.id}`}>
              <NoticeCard className="h-full flex flex-col">
                <Tag tone="rice">{mission.categorie}</Tag>
                <p className="mt-3 font-display text-lg font-medium line-clamp-2">
                  {mission.titre}
                </p>
                <p className="mt-2 text-sm text-ink-soft line-clamp-2 flex-1">
                  {mission.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-sm text-ocre-dark">
                    {formatArgent(mission.budget)}
                  </span>
                  <span className="text-xs text-ink-soft/70">
                    avant le {formatDate(mission.dateLimite)}
                  </span>
                </div>
                {mission.competencesRequises.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mission.competencesRequises.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="text-[11px] border border-ink/20 px-1.5 py-0.5 text-ink-soft"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </NoticeCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

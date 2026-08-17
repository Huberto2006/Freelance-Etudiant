'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { formatArgent, formatDate } from '@/lib/format';
import { NoticeCard, Tag } from '@/components/ui/Notice';
import { BarreRecherche, type Filtres } from '@/components/ui/BarreRecherche';

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);
  

  // Recherche appelée par BarreRecherche
  const rechercher = useCallback(async (filtres: Filtres = {}) => {
    setChargement(true);
    const params = new URLSearchParams();
    if (filtres.motsCles) params.set('motsCles', filtres.motsCles);
    if (filtres.categorie) params.set('categorie', filtres.categorie);
    if (filtres.competence) params.set('competence', filtres.competence);

    try {
      const data = await api.get(`/missions?${params.toString()}`, { auth: false }) as Mission[];
      setMissions(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const charger = async () => {
      setChargement(true);
      try {
        const data = await api.get('/missions', { auth: false }) as Mission[];
        if (!cancelled) setMissions(data);
      } finally {
        if (!cancelled) setChargement(false);
      }
    };

    charger();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <BarreRecherche onFiltrer={rechercher} />
      </div>

      <h1 className="text-3xl font-bold mb-2">Panneau d&apos;affichage</h1>
      <h2 className="text-xl text-muted-foreground mb-6">Missions</h2>

      {chargement ? (
        <p>Chargement…</p>
      ) : missions.length === 0 ? (
        <NoticeCard>
          Aucune mission ne correspond à ces critères pour le moment.
        </NoticeCard>
      ) : (
        <div className="grid gap-4">
          {missions.map((mission) => (
            <Link
              key={mission.id}
              href={`/missions/${mission.id}`}
              className="block"
            >
              <NoticeCard>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Tag>{mission.categorie}</Tag>
                    <h3 className="text-lg font-semibold mt-2">{mission.titre}</h3>
                    <p className="text-muted-foreground mt-1">{mission.description}</p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{formatArgent(mission.budget)}</div>
                    <div className="text-muted-foreground">
                      avant le {formatDate(mission.dateLimite)}
                    </div>
                  </div>
                </div>

                {mission.competencesRequises.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {mission.competencesRequises.slice(0, 4).map((c) => (
                      <Tag key={c}>{c}</Tag>
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

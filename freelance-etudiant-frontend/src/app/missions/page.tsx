'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { formatArgent, formatDateCourte } from '@/lib/format';
import { NoticeCard, Tag } from '@/components/ui/Notice';
import { Avatar } from '@/components/ui/Avatar';
import { BarreRecherche, type Filtres } from '@/components/ui/BarreRecherche';
import { FavoriBouton } from '@/components/ui/FavoriBouton';

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
    if (filtres.budgetMin) params.set('budgetMin', filtres.budgetMin);
    if (filtres.budgetMax) params.set('budgetMax', filtres.budgetMax);

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
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <BarreRecherche onFiltrer={rechercher} avecBudget />
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
        <div className="flex flex-col gap-5">
          {missions.map((mission) => {
            const client = mission.client;
            const auteur = client?.utilisateur;

            return (
              <NoticeCard key={mission.id} className="flex flex-col gap-4">
                {/* En-tête façon publication : avatar + auteur */}
                <div className="flex items-center gap-3">
                  <Avatar
                    nom={auteur?.nom ?? 'Client'}
                    photoUrl={auteur?.photoUrl}
                    size={44}
                    href={client ? `/clients/${client.utilisateurId}` : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={client ? `/clients/${client.utilisateurId}` : '#'}
                      className="font-display font-medium hover:underline"
                    >
                      {auteur?.nom ?? 'Client Kianja'}
                    </Link>
                    <p className="flex items-center gap-1.5 text-xs text-ink-soft/70">
                      <Tag tone="ink">Client</Tag>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={11} />
                        {formatDateCourte(mission.dateCreation)}
                      </span>
                    </p>
                  </div>
                  <FavoriBouton cibleType="mission" cibleId={mission.id} />
                </div>

                {/* Corps de la publication */}
                <Link href={`/missions/${mission.id}`} className="block">
                  <Tag>{mission.categorie}</Tag>
                  <h3 className="text-lg font-semibold mt-2">{mission.titre}</h3>
                  <p className="text-muted-foreground mt-1 line-clamp-3">
                    {mission.description}
                  </p>
                </Link>

                {mission.competencesRequises.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mission.competencesRequises.slice(0, 4).map((c) => (
                      <Tag key={c} tone="rice">
                        #{c}
                      </Tag>
                    ))}
                  </div>
                )}

                {/* Pied : budget et échéance */}
                <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-sm">
                  <span className="font-mono font-medium text-ocre-dark">
                    {formatArgent(mission.budget)}
                  </span>
                  <span className="text-muted-foreground">
                    candidatures avant le {formatDateCourte(mission.dateLimite)}
                  </span>
                </div>
              </NoticeCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

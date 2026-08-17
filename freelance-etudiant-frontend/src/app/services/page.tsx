'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ServiceOffert } from '@/lib/types';
import { formatArgent } from '@/lib/format';
import { NoticeCard, StampBadge, Tag } from '@/components/ui/Notice';
import {
  BarreRecherche,
  type Filtres,
} from '@/components/ui/BarreRecherche';

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);

  // Recherche et filtrage appelée par BarreRecherche
  const rechercher = useCallback(async (filtres: Filtres = {}) => {
    setChargement(true);

    const params = new URLSearchParams();

    if (filtres.motsCles) {
      params.set('motsCles', filtres.motsCles);
    }

    if (filtres.categorie) {
      params.set('categorie', filtres.categorie);
    }

    if (filtres.competence) {
      params.set('competence', filtres.competence);
    }

    try {
      const data = await api.get(
        `/services?${params.toString()}`,
        { auth: false },
      ) as ServiceOffert[];

      setServices(data);
    } finally {
      setChargement(false);
    }
  }, []);

  // Chargement initial des services
  useEffect(() => {
    let cancelled = false;

    const charger = async () => {
      setChargement(true);

      try {
        const data = await api.get(
          '/services',
          { auth: false },
        ) as ServiceOffert[];

        if (!cancelled) {
          setServices(data);
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    };

    charger();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">

      {/* Barre de recherche */}
      <div className="mb-8">
        <BarreRecherche
          onFiltrer={rechercher}
          placeholder="Design, développement, rédaction…"
        />
      </div>

      {/* Titre */}
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
        Étals du kianja
      </p>

      <h1 className="text-3xl font-bold mb-2">
        Services
      </h1>

      {/* Contenu */}
      {chargement ? (
        <p className="text-sm text-muted-foreground">
          Chargement…
        </p>
      ) : services.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-muted-foreground">
            Aucun service ne correspond à ces critères pour le moment.
          </p>
        </NoticeCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {services.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className="block h-full"
            >
              <NoticeCard className="h-full flex flex-col">

                {/* Catégorie + réputation */}
                <div className="flex items-start justify-between gap-3">

                  <Tag tone="ocre">
                    {service.categorie}
                  </Tag>

                  {service.etudiant && (
                    <StampBadge
                      score={
                        Number(service.etudiant.scoreReputation) || 0
                      }
                      size={40}
                    />
                  )}

                </div>

                {/* Titre */}
                <h3 className="text-lg font-semibold mt-3 line-clamp-2">
                  {service.titre}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">
                  {service.description}
                </p>

                {/* Étudiant */}
                {service.etudiant?.utilisateur && (
                  <p className="mt-3 text-xs text-ink-soft/80">
                    par {service.etudiant.utilisateur.nom}
                  </p>
                )}

                {/* Prix + délai */}
                <div className="mt-4 flex items-center justify-between">

                  <span className="font-mono text-sm text-ocre-dark">
                    {formatArgent(service.prix)}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    livré en {service.delai} j
                  </span>

                </div>

              </NoticeCard>
            </Link>
          ))}

        </div>
      )}
    </div>
  );
}
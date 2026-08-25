'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Timer } from 'lucide-react';
import { api } from '@/lib/api';
import type { ServiceOffert } from '@/lib/types';
import { formatArgent, formatDateCourte } from '@/lib/format';
import { NoticeCard, Tag } from '@/components/ui/Notice';
import { Avatar } from '@/components/ui/Avatar';
import {
  BarreRecherche,
  type Filtres,
} from '@/components/ui/BarreRecherche';
import { FavoriBouton } from '@/components/ui/FavoriBouton';

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

    if (filtres.budgetMin) {
      params.set('budgetMin', filtres.budgetMin);
    }

    if (filtres.budgetMax) {
      params.set('budgetMax', filtres.budgetMax);
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
    <div className="container mx-auto max-w-2xl px-4 py-8">

      {/* Barre de recherche */}
      <div className="mb-8">
        <BarreRecherche
          onFiltrer={rechercher}
          placeholder="Design, développement, rédaction…"
          avecBudget
        />
      </div>

      {/* Titre */}
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
        Étals du kianja
      </p>

      <h1 className="text-3xl font-bold mb-6">
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
        <div className="flex flex-col gap-5">
          {services.map((service) => {
            const etudiant = service.etudiant;
            const auteur = etudiant?.utilisateur;

            return (
              <NoticeCard key={service.id} className="flex flex-col gap-4">
                {/* En-tête façon publication : avatar + auteur */}
                <div className="flex items-center gap-3">
                  <Avatar
                    nom={auteur?.nom ?? 'Étudiant'}
                    photoUrl={auteur?.photoUrl}
                    size={44}
                    href={etudiant ? `/etudiants/${etudiant.utilisateurId}` : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={etudiant ? `/etudiants/${etudiant.utilisateurId}` : '#'}
                      className="font-display font-medium hover:underline"
                    >
                      {auteur?.nom ?? 'Étudiant Kianja'}
                    </Link>
                    <p className="flex items-center gap-1.5 text-xs text-ink-soft/70">
                      <Tag tone="rice">Étudiant</Tag>
                      {etudiant && (
                        <span>
                          note {Number(etudiant.noteMoyenne).toFixed(1)}/5
                        </span>
                      )}
                    </p>
                  </div>
                  <FavoriBouton cibleType="service" cibleId={service.id} />
                </div>

                {/* Corps de la publication */}
                <Link href={`/services/${service.id}`} className="block">
                  <Tag tone="ocre">{service.categorie}</Tag>
                  <h3 className="text-lg font-semibold mt-2">
                    {service.titre}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {service.description}
                  </p>
                </Link>

                {service.competences.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {service.competences.slice(0, 4).map((c) => (
                      <Tag key={c} tone="rice">
                        #{c}
                      </Tag>
                    ))}
                  </div>
                )}

                {/* Pied : prix + délai */}
                <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-sm">
                  <span className="font-mono font-medium text-ocre-dark">
                    {formatArgent(service.prix)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Timer size={13} />
                    livré en {service.delai} j
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

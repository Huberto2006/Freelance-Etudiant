"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { NoticeCard, StampBadge, Tag } from "@/components/ui/Notice";
import { BarreRecherche, type Filtres } from "@/components/ui/BarreRecherche";

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async (filtres: Filtres = {}) => {
    setChargement(true);
    const params = new URLSearchParams();
    if (filtres.motsCles) params.set("motsCles", filtres.motsCles);
    if (filtres.categorie) params.set("categorie", filtres.categorie);
    if (filtres.competence) params.set("competence", filtres.competence);
    try {
      const data = await api.get<ServiceOffert[]>(`/services?${params.toString()}`, {
        auth: false,
      });
      setServices(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
        Étals du kianja
      </p>
      <h1 className="font-display text-4xl font-semibold mb-8">Services</h1>

      <BarreRecherche
        onFiltrer={charger}
        placeholder="Design, développement, rédaction…"
      />

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Aucun service ne correspond à ces critères pour le moment.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link key={service.id} href={`/services/${service.id}`}>
              <NoticeCard className="h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Tag tone="ocre">{service.categorie}</Tag>
                  {service.etudiant && (
                    <StampBadge
                      score={Number(service.etudiant.scoreReputation) || 0}
                      size={40}
                    />
                  )}
                </div>
                <p className="mt-3 font-display text-lg font-medium line-clamp-2">
                  {service.titre}
                </p>
                <p className="mt-2 text-sm text-ink-soft line-clamp-2 flex-1">
                  {service.description}
                </p>
                {service.etudiant?.utilisateur && (
                  <p className="mt-3 text-xs text-ink-soft/80">
                    par {service.etudiant.utilisateur.nom}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-sm text-ocre-dark">
                    {formatArgent(service.prix)}
                  </span>
                  <span className="text-xs text-ink-soft/70">
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

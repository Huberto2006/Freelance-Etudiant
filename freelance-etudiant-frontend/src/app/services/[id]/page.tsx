"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ServiceOffert } from "@/lib/types";
import { formatArgent, formatDate } from "@/lib/format";
import { NoticeCard, StampBadge, Tag } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [service, setService] = useState<ServiceOffert | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api
      .get<ServiceOffert>(`/services/${id}`, { auth: false })
      .then(setService)
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  if (!service) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-brique">
        Ce service est introuvable.
      </p>
    );
  }

  const etudiant = service.etudiant;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <Tag tone="ocre">{service.categorie}</Tag>
      <h1 className="mt-4 font-display text-3xl sm:text-4xl font-semibold mb-3">
        {service.titre}
      </h1>
      <p className="text-sm text-ink-soft mb-8">
        Publié le {formatDate(service.dateCreation)}
      </p>

      <NoticeCard className="mb-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
              Prix
            </p>
            <p className="font-display text-2xl text-ocre-dark">
              {formatArgent(service.prix)}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
              Délai de livraison
            </p>
            <p className="font-display text-2xl">{service.delai} jours</p>
          </div>
        </div>
      </NoticeCard>

      <div className="mb-10">
        <h2 className="font-display text-xl font-semibold mb-3">Description</h2>
        <p className="text-sm text-ink-soft whitespace-pre-line leading-relaxed">
          {service.description}
        </p>
      </div>

      {service.competences.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-xl font-semibold mb-3">
            Compétences mobilisées
          </h2>
          <div className="flex flex-wrap gap-2">
            {service.competences.map((c) => (
              <Tag key={c} tone="rice">
                {c}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {etudiant && (
        <NoticeCard>
          <div className="flex items-center gap-4">
            <StampBadge score={Number(etudiant.scoreReputation) || 0} />
            <div>
              <p className="font-display text-lg font-medium">
                {etudiant.utilisateur?.nom}
              </p>
              <p className="text-sm text-ink-soft">
                {etudiant.universite ?? "Étudiant freelance"}
                {etudiant.niveauEtude ? ` · ${etudiant.niveauEtude}` : ""}
              </p>
              <p className="text-xs text-ink-soft/70 mt-1">
                {etudiant.nombreMissionsTerminees} projet(s) livré(s) ·
                note moyenne {Number(etudiant.noteMoyenne).toFixed(1)}/5
              </p>
            </div>
          </div>
          <Link href={`/etudiants/${etudiant.utilisateurId}`}>
            <Button variant="ghost" size="sm" className="mt-4">
              Voir le profil complet
            </Button>
          </Link>
        </NoticeCard>
      )}
    </div>
  );
}

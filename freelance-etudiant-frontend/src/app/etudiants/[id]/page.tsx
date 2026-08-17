"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { EtudiantProfile, ServiceOffert } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { NoticeCard, StampBadge, Tag } from "@/components/ui/Notice";

export default function ProfilEtudiantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [etudiant, setEtudiant] = useState<EtudiantProfile | null>(null);
  const [services, setServices] = useState<ServiceOffert[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<EtudiantProfile>(`/etudiants/${id}`, { auth: false }),
      api.get<ServiceOffert[]>(`/services`, { auth: false }),
    ])
      .then(([profil, tousServices]) => {
        setEtudiant(profil);
        setServices(tousServices.filter((s) => s.etudiantId === id));
      })
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  if (!etudiant) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-brique">
        Profil introuvable.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="flex items-start gap-5 mb-8">
        <StampBadge score={Number(etudiant.scoreReputation) || 0} size={72} />
        <div>
          <h1 className="font-display text-3xl font-semibold">
            {etudiant.utilisateur?.nom}
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {etudiant.universite ?? "Étudiant freelance"}
            {etudiant.niveauEtude ? ` · ${etudiant.niveauEtude}` : ""}
          </p>
          <p className="text-xs text-ink-soft/70 mt-1 font-mono">
            {etudiant.nombreMissionsTerminees} projet(s) livré(s) · note
            moyenne {Number(etudiant.noteMoyenne).toFixed(1)}/5 ·{" "}
            {etudiant.disponibilite ? (
              <span className="text-rice">disponible</span>
            ) : (
              <span className="text-brique">indisponible</span>
            )}
          </p>
        </div>
      </div>

      {etudiant.description && (
        <p className="text-sm text-ink-soft leading-relaxed mb-8 whitespace-pre-line">
          {etudiant.description}
        </p>
      )}

      {etudiant.competences.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-lg font-semibold mb-3">Compétences</h2>
          <div className="flex flex-wrap gap-2">
            {etudiant.competences.map((c) => (
              <Tag key={c} tone="rice">
                {c}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-4">
            Services proposés
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <Link key={service.id} href={`/services/${service.id}`}>
                <NoticeCard>
                  <p className="font-display font-medium">{service.titre}</p>
                  <p className="mt-2 font-mono text-sm text-ocre-dark">
                    {formatArgent(service.prix)}
                  </p>
                </NoticeCard>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

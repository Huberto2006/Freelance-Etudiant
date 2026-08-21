"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { api } from "@/lib/api";
import type { Favori, Mission, ServiceOffert, EtudiantProfile } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";
import { FavoriBouton } from "@/components/ui/FavoriBouton";

export default function FavorisPage() {
  const [favoris, setFavoris] = useState<Favori[]>([]);
  const [missions, setMissions] = useState<Record<string, Mission>>({});
  const [services, setServices] = useState<Record<string, ServiceOffert>>({});
  const [etudiants, setEtudiants] = useState<Record<string, EtudiantProfile>>({});
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    api
      .get<Favori[]>("/favoris")
      .then(async (liste) => {
        setFavoris(liste);

        const missionsIds = liste.filter((f) => f.cibleType === "mission").map((f) => f.cibleId);
        const servicesIds = liste.filter((f) => f.cibleType === "service").map((f) => f.cibleId);
        const etudiantsIds = liste.filter((f) => f.cibleType === "etudiant").map((f) => f.cibleId);

        const [missionsData, servicesData, etudiantsData] = await Promise.all([
          Promise.all(missionsIds.map((id) => api.get<Mission>(`/missions/${id}`))),
          Promise.all(servicesIds.map((id) => api.get<ServiceOffert>(`/services/${id}`))),
          Promise.all(etudiantsIds.map((id) => api.get<EtudiantProfile>(`/etudiants/${id}`))),
        ]);

        setMissions(Object.fromEntries(missionsData.map((m) => [m.id, m])));
        setServices(Object.fromEntries(servicesData.map((s) => [s.id, s])));
        setEtudiants(
          Object.fromEntries(etudiantsData.map((e) => [e.utilisateurId, e])),
        );
      })
      .finally(() => setChargement(false));
  }, []);

  if (chargement) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <PageHeader icon={Heart} eyebrow="Mes sauvegardes" title="Favoris" />

      {favoris.length === 0 ? (
        <NoticeCard className="flex flex-col items-center gap-3 py-10 text-center">
          <Heart size={28} className="text-ink-soft/50" />
          <p className="text-sm text-ink-soft/70">
            Ajoutez des missions, services ou profils à vos favoris pour les
            retrouver ici.
          </p>
        </NoticeCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {favoris.map((favori) => {
            if (favori.cibleType === "mission") {
              const mission = missions[favori.cibleId];
              if (!mission) return null;
              return (
                <Link key={favori.id} href={`/missions/${mission.id}`}>
                  <NoticeCard className="relative flex flex-col gap-2">
                    <p className="font-display font-medium pr-8">{mission.titre}</p>
                    <p className="font-mono text-sm text-ocre-dark">
                      {formatArgent(mission.budget)}
                    </p>
                    <div className="absolute right-4 top-4">
                      <FavoriBouton cibleType="mission" cibleId={mission.id} />
                    </div>
                  </NoticeCard>
                </Link>
              );
            }
            if (favori.cibleType === "service") {
              const service = services[favori.cibleId];
              if (!service) return null;
              return (
                <Link key={favori.id} href={`/services/${service.id}`}>
                  <NoticeCard className="relative flex flex-col gap-2">
                    <p className="font-display font-medium pr-8">{service.titre}</p>
                    <p className="font-mono text-sm text-ocre-dark">
                      {formatArgent(service.prix)}
                    </p>
                    <div className="absolute right-4 top-4">
                      <FavoriBouton cibleType="service" cibleId={service.id} />
                    </div>
                  </NoticeCard>
                </Link>
              );
            }
            const etudiant = etudiants[favori.cibleId];
            if (!etudiant) return null;
            return (
              <Link key={favori.id} href={`/etudiants/${etudiant.utilisateurId}`}>
                <NoticeCard className="relative flex flex-col gap-2">
                  <p className="font-display font-medium pr-8">
                    {etudiant.utilisateur?.nom}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {etudiant.universite ?? "Étudiant freelance"}
                  </p>
                  <div className="absolute right-4 top-4">
                    <FavoriBouton cibleType="etudiant" cibleId={etudiant.utilisateurId} />
                  </div>
                </NoticeCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

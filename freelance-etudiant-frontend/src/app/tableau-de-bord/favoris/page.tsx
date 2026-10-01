"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { api } from "@/lib/api";
import type { Favori, Mission, ServiceOffert, EtudiantProfile } from "@/lib/types";
import { formatArgent } from "@/lib/format";
import { EtatVide, NoticeCard, PageHeader } from "@/components/ui/Notice";
import { FavoriBouton } from "@/components/ui/FavoriBouton";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { useApiList } from "@/hooks/useApiList";

type FavorisEnrichis = {
  favoris: Favori[];
  missions: Record<string, Mission>;
  services: Record<string, ServiceOffert>;
  etudiants: Record<string, EtudiantProfile>;
};

async function chargerFavoris(): Promise<FavorisEnrichis> {
  const liste = await api.get<Favori[]>("/favoris");

  const missionsIds = liste.filter((f) => f.cibleType === "mission").map((f) => f.cibleId);
  const servicesIds = liste.filter((f) => f.cibleType === "service").map((f) => f.cibleId);
  const etudiantsIds = liste.filter((f) => f.cibleType === "etudiant").map((f) => f.cibleId);

  const [missionsData, servicesData, etudiantsData] = await Promise.all([
    Promise.all(missionsIds.map((id) => api.get<Mission>(`/missions/${id}`))),
    Promise.all(servicesIds.map((id) => api.get<ServiceOffert>(`/services/${id}`))),
    Promise.all(etudiantsIds.map((id) => api.get<EtudiantProfile>(`/etudiants/${id}`))),
  ]);

  return {
    favoris: liste,
    missions: Object.fromEntries(missionsData.map((m) => [m.id, m])),
    services: Object.fromEntries(servicesData.map((s) => [s.id, s])),
    etudiants: Object.fromEntries(etudiantsData.map((e) => [e.utilisateurId, e])),
  };
}

export default function FavorisPage() {
  const { donnees, chargement, erreur } = useApiList(chargerFavoris);
  const favoris = donnees?.favoris ?? [];
  const missions = donnees?.missions ?? {};
  const services = donnees?.services ?? {};
  const etudiants = donnees?.etudiants ?? {};

  if (chargement) {
    return <p className="mx-auto max-w-3xl px-5 py-16 text-sm text-ink-soft">Chargement…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord" forcer />
      </div>

      <PageHeader icon={Heart} eyebrow="Mes sauvegardes" title="Favoris" />

      {erreur && (
        <NoticeCard className="mb-4 text-sm text-brique">{erreur}</NoticeCard>
      )}

      {favoris.length === 0 && !erreur ? (
        <EtatVide icon={Heart}>
          Ajoutez des missions, services ou profils à vos favoris pour les
          retrouver ici.
        </EtatVide>
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

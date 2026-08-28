"use client";

import { BriefcaseBusiness } from "lucide-react";

import type { Mission } from "@/lib/types";

import { CarteMission } from "@/components/ui/CarteMission";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

/**
 * Section « Missions récentes » : les dernières missions ouvertes
 * publiees par les clients, triees par le backend du plus recent au plus
 * ancien.
 */
export function SectionMissions({ missions }: { missions: Mission[] }) {
  const recentes = missions.slice(0, 6);

  return (
    <section id="missions" className="mt-16 scroll-mt-24">
      <SectionTitre
        icon={BriefcaseBusiness}
        eyebrow="Cahiers de charge"
        titre="Missions récentes"
        sousTitre="Les dernières opportunités publiées par les clients."
        lienHref="/missions"
        lienLabel="Voir toutes les missions"
      />

      {recentes.length === 0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Aucune mission ouverte pour le moment. Les clients peuvent
            publier leurs projets depuis leur tableau de bord.
          </p>
        </NoticeCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recentes.map((mission) => (
            <CarteMission key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </section>
  );
}
"use client";

import { BriefcaseBusiness } from "lucide-react";

import type { Mission } from "@/lib/types";

import { CarteMission } from "@/components/ui/CarteMission";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

/**
 * Section « Missions récentes » : les dernières missions ouvertes
 * publiées par les clients, ouvertes aux candidatures des étudiants.
 */
export function SectionMissions({ missions }: { missions: Mission[] }) {
  const recentes = missions.slice(0, 6);

  return (
    <section id="missions" className="mx-auto max-w-6xl px-4 pb-8 sm:px-5 sm:pb-12">
      <SectionTitre
        icon={BriefcaseBusiness}
        eyebrow="Besoins des clients · Opportunités"
        titre="Projets et missions à pourvoir"
        sousTitre="Découvrez les besoins réels déposés par les clients et entreprises. Postulez pour mettre en pratique vos compétences."
        lienHref="/missions"
        lienLabel="Voir toutes les missions"
      />

      {recentes.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bleu/10 text-bleu-dark">
              <BriefcaseBusiness size={20} aria-hidden="true" />
            </span>
            <p className="max-w-md text-sm text-ink-soft">
              Aucune mission ouverte pour le moment. Vous avez un projet à concrétiser ? Publiez la première mission pour recevoir des candidatures d&apos;étudiants.
            </p>
          </div>
        </NoticeCard>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentes.map((mission) => (
              <CarteMission key={mission.id} mission={mission} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
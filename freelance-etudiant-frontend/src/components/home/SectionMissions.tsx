"use client";

import Link from "next/link";
import { BriefcaseBusiness, Plus } from "lucide-react";

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
    <section id="missions" className="mt-16 scroll-mt-24 sm:mt-20">
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
            <Link
              href="/missions"
              className="inline-flex items-center gap-1.5 rounded-lg bg-bleu px-3.5 py-2 text-xs font-medium text-white transition hover:bg-bleu-dark"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Publier une mission</span>
            </Link>
          </div>
        </NoticeCard>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentes.map((mission) => (
              <CarteMission key={mission.id} mission={mission} />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper-light px-5 py-3.5 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-ink-soft">
              Vous représentez une entreprise ou vous avez un besoin personnel ?
            </p>
            <Link
              href="/missions"
              className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold text-bleu-dark transition hover:text-bleu"
            >
              <Plus size={13} aria-hidden="true" />
              <span>Publier une mission maintenant →</span>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
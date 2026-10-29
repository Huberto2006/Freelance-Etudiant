"use client";

import { BriefcaseBusiness } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Mission } from "@/types/missions";

import { CarteMission } from "@/features/missions/components/CarteMission";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

/**
 * Section « Missions récentes » : les dernières missions ouvertes
 * publiées par les clients, ouvertes aux candidatures des étudiants.
 */
export function SectionMissions({ missions }: { missions: Mission[] }) {
  const t = useTranslations("home.missions");
  const recentes = missions.slice(0, 6);

  return (
    <section id="missions" className="mx-auto max-w-6xl px-4 pb-8 sm:px-5 sm:pb-12">
      <SectionTitre
        icon={BriefcaseBusiness}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        sousTitre={t("subtitle")}
        lienHref="/missions"
        lienLabel={t("seeAll")}
      />

      {recentes.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bleu/10 text-bleu-dark">
              <BriefcaseBusiness size={20} aria-hidden="true" />
            </span>
            <p className="max-w-md text-sm text-ink-soft">
              {t("empty")}
            </p>
          </div>
        </NoticeCard>
      ) : (
        <>
          <div className="reveal-grille grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentes.map((mission) => (
              <CarteMission key={mission.id} mission={mission} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
"use client";

import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ServiceOffert } from "@/lib/types";

import { CarteService } from "@/components/ui/CarteService";
import { NoticeCard } from "@/components/ui/Notice";
import { SectionTitre } from "./SectionTitre";

/**
 * Section « Services populaires » : les prestations des étudiants les
 * mieux notés, présentées sous forme de catalogue.
 */
export function SectionServices({ services }: { services: ServiceOffert[] }) {
  const t = useTranslations("home.services");
  const populaires = [...services]
    .sort(
      (a, b) =>
        Number(b.etudiant?.noteMoyenne ?? 0) -
          Number(a.etudiant?.noteMoyenne ?? 0) ||
        Number(b.etudiant?.scoreReputation ?? 0) -
          Number(a.etudiant?.scoreReputation ?? 0),
    )
    .slice(0, 8);

  return (
    <section id="services" className="mx-auto max-w-6xl px-4 pb-8 sm:px-5 sm:pb-12">
      <SectionTitre
        icon={Wrench}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        sousTitre={t("subtitle")}
        lienHref="/services"
        lienLabel={t("seeAll")}
      />

      {populaires.length === 0 ? (
        <NoticeCard>
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
              <Wrench size={20} aria-hidden="true" />
            </span>
            <p className="max-w-md text-sm text-ink-soft">
              {t("empty")}
            </p>
          </div>
        </NoticeCard>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {populaires.map((service) => (
              <CarteService key={service.id} service={service} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
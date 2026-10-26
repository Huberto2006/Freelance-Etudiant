import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Compass,
  Handshake,
  Info,
  Lock,
  Scale,
  Sprout,
} from "lucide-react";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const ETAPES = ["need", "match", "delivery"] as const;

const VALEURS = [
  { icon: Sprout, cle: "open" },
  { icon: Scale, cle: "clear" },
  { icon: Lock, cle: "protect" },
  { icon: Handshake, cle: "trust" },
] as const;

export default async function PageAPropos() {
  const t = await getTranslations("about");
  return (
    <div className="mx-auto max-w-4xl px-5 pb-7 pt-8 sm:pt-11">
      <EnTetePagePublique
        icon={Info}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        introduction={t("intro")}
      />

      {/* ------------------------------------------------ MISSION */}
      <section aria-labelledby="mission" className="mb-10">
        <h2
          id="mission"
          className="font-display text-2xl font-semibold text-ink"
        >
          {t("missionTitle")}
        </h2>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-soft">
          <p>{t("mission1")}</p>
          <p>{t("mission2")}</p>
        </div>
      </section>

      {/* ------------------------------------------------ PROBLÈME */}
      <section aria-labelledby="probleme" className="mb-10">
        <h2
          id="probleme"
          className="font-display text-2xl font-semibold text-ink"
        >
          {t("problemTitle")}
        </h2>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-soft">
          <p>{t("problem1")}</p>
          <p>{t("problem2")}</p>
        </div>
      </section>

      {/* ------------------------------------------------ FONCTIONNEMENT */}
      <section aria-labelledby="fonctionnement" className="mb-10">
        <h2
          id="fonctionnement"
          className="font-display text-2xl font-semibold text-ink"
        >
          {t("howTitle")}
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {ETAPES.map((etape, index) => (
            <li
              key={etape}
              className="rounded-xl border border-ink/10 bg-paper-light p-5 shadow-xs"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-paper-light"
              >
                {index + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">
                {t(`steps.${etape}.title`)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {t(`steps.${etape}.detail`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------ VALEURS */}
      <section aria-labelledby="valeurs" className="mb-10">
        <h2
          id="valeurs"
          className="font-display text-2xl font-semibold text-ink"
        >
          {t("valuesTitle")}
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {VALEURS.map((valeur) => {
            const Icone = valeur.icon;
            return (
              <li
                key={valeur.cle}
                className="flex gap-3 rounded-xl border border-ink/10 bg-paper-light p-5 shadow-xs"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ocre/10 text-ocre-dark"
                >
                  <Icone size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">
                    {t(`values.${valeur.cle}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {t(`values.${valeur.cle}.detail`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------------------------ VISION */}
      <section aria-labelledby="vision" className="mb-10">
        <h2
          id="vision"
          className="font-display text-2xl font-semibold text-ink"
        >
          {t("visionTitle")}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          {t("vision")}
        </p>
      </section>

      {/* ------------------------------------------------ APPEL À L'ACTION */}
      <section
        aria-labelledby="rejoindre"
        className="rounded-2xl border border-ink/10 bg-paper-light p-6 text-center shadow-sm sm:p-8"
      >
        <span
          aria-hidden="true"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-bleu-soft text-bleu-dark"
        >
          <Compass size={20} />
        </span>
        <h2
          id="rejoindre"
          className="mt-3 font-display text-xl font-semibold text-ink"
        >
          {t("ctaTitle")}
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          {t("ctaText")}
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link
            href="/publications"
            className="inline-flex items-center justify-center rounded-lg border border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          >
            {t("explore")}
          </Link>
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft"
          >
            {t("join")}
          </Link>
        </div>
      </section>
    </div>
  );
}

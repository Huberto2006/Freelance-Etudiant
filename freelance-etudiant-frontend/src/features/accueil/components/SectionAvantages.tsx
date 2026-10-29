"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  GraduationCap,
  HandCoins,
  MessagesSquare,
  Rocket,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";
import { useAuth } from "@/lib/auth-context";
import { SectionTitre } from "./SectionTitre";

const AVANTAGES = [
  { icon: GraduationCap, cle: "talents" },
  { icon: Rocket, cle: "springboard" },
  { icon: MessagesSquare, cle: "secure" },
  { icon: HandCoins, cle: "budgets" },
] as const;

export function SectionAvantages() {
  const t = useTranslations("home.benefits");
  const { utilisateur, chargement } = useAuth();

  return (
    <section id="avantages" className="mx-auto max-w-6xl px-4 pb-8 sm:px-5 sm:pb-12">
      <SectionTitre
        icon={ShieldCheck}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        sousTitre={t("subtitle")}
      />

      <div className="reveal-grille grid gap-4 sm:grid-cols-2">
        {AVANTAGES.map((avantage) => {
          const Icone = avantage.icon;

          return (
            <NoticeCard key={avantage.cle} className="flex items-start gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bleu/10 text-bleu-dark"
                aria-hidden="true"
              >
                <Icone size={18} />
              </span>

              <div>
                <h3 className="font-display font-semibold text-ink">
                  {t(`${avantage.cle}.title`)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {t(`${avantage.cle}.text`)}
                </p>
              </div>
            </NoticeCard>
          );
        })}
      </div>

      {/* Appel à l'action final : un seul bloc, masqué pour les connectés */}
      {!chargement && !utilisateur && (
        <div className="mt-14 rounded-lg border border-ink/10 bg-paper-light px-6 py-10 text-center sm:px-10">
          <h3 className="font-display text-2xl font-semibold sm:text-3xl">
            {t("ctaTitle")}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
            {t("ctaText")}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Button href="/inscription" size="lg">
              {t("ctaButton")}
            </Button>
            <Link
              href="/publications"
              className="text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              {t("explorePublications")}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
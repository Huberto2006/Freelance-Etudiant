import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronDown, CircleHelp, LifeBuoy } from "lucide-react";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

/**
 * Chaque réponse décrit uniquement ce que la plateforme fait réellement
 * aujourd'hui. Les textes sont dans messages/<langue>/faq.json : à mettre
 * à jour en même temps que les fonctionnalités concernées.
 */
const THEMES: { id: string; questions: string[] }[] = [
  { id: "inscription", questions: ["who", "verify", "forgot"] },
  { id: "profils", questions: ["fill", "visibility"] },
  { id: "publications", questions: ["diff", "account"] },
  { id: "candidatures", questions: ["apply", "choose"] },
  { id: "services", questions: ["offer", "request"] },
  { id: "livraisons", questions: ["delivery"] },
  { id: "paiements", questions: ["how", "methods", "setup"] },
  { id: "securite", questions: ["privacy", "report"] },
];

export default async function PageFaq() {
  const t = await getTranslations("faq");
  const cle = (theme: string, question: string, champ: "question" | "answer") =>
    t(`themes.${theme}.items.${question}.${champ}` as never);

  return (
    <div className="mx-auto max-w-4xl px-5 pb-7 pt-8 sm:pt-11">
      <EnTetePagePublique
        icon={CircleHelp}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        introduction={t("intro")}
      />

      {/* Sommaire : ancres vers chaque thème */}
      <nav
        aria-label={t("navAria")}
        className="mb-8 flex flex-wrap gap-2"
      >
        {THEMES.map((theme) => (
          <a
            key={theme.id}
            href={`#${theme.id}`}
            className="rounded-full border border-ink/15 bg-paper-light px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-bleu/40 hover:bg-bleu/10 hover:text-bleu-dark"
          >
            {t(`themes.${theme.id}.title` as never)}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {THEMES.map((theme) => (
          <section
            key={theme.id}
            id={theme.id}
            aria-labelledby={`${theme.id}-titre`}
            className="scroll-mt-24"
          >
            <h2
              id={`${theme.id}-titre`}
              className="font-display text-xl font-semibold text-ink"
            >
              {t(`themes.${theme.id}.title` as never)}
            </h2>

            <div className="mt-4 divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-paper-light shadow-xs">
              {theme.questions.map((element) => (
                <details key={element} className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-ink marker:content-none hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bleu [&::-webkit-details-marker]:hidden">
                    <span>{cle(theme.id, element, "question")}</span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-ink-soft transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-ink-soft">
                    {cle(theme.id, element, "answer")}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Renvoi vers le contact */}
      <aside className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-ink/10 bg-paper-light p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bleu-soft text-bleu-dark"
          >
            <LifeBuoy size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              {t("noAnswerTitle")}
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {t("noAnswerText")}
            </p>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft"
        >
          {t("contactButton")}
        </Link>
      </aside>
    </div>
  );
}

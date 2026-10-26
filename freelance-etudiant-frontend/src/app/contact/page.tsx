import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CircleHelp, LifeBuoy } from "lucide-react";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";
import { FormulaireContact } from "@/components/contact/FormulaireContact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PageContact() {
  const t = await getTranslations("contact");
  return (
    <div className="mx-auto max-w-5xl px-5 pb-7 pt-8 sm:pt-11">
      <EnTetePagePublique
        icon={LifeBuoy}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        introduction={t("intro")}
      />

      <div className="grid gap-7 lg:grid-cols-[1fr_20rem]">
        <FormulaireContact />

        <aside className="h-fit rounded-2xl border border-ink/10 bg-paper-light p-5 shadow-xs">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-bleu-soft text-bleu-dark"
          >
            <CircleHelp size={18} />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-ink">
            {t("beforeTitle")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {t("beforeText")}
          </p>
          <Link
            href="/faq"
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-ink/30 px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          >
            {t("faqLink")}
          </Link>
        </aside>
      </div>
    </div>
  );
}

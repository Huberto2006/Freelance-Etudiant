import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EnTetePagePublique } from "@/components/layout/EnTetePagePublique";
import { ListeFreelances } from "@/features/freelances/components/ListeFreelances";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("freelances");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PageFreelances() {
  const t = await getTranslations("freelances");
  return (
    <div className="mx-auto max-w-7xl px-5 pb-7 pt-8 sm:pt-11">
      <EnTetePagePublique
        icon={Users}
        eyebrow={t("eyebrow")}
        titre={t("title")}
        introduction={t("intro")}
      />

      <ListeFreelances />
    </div>
  );
}

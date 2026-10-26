"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { CompletionProfil } from "@/lib/dashboard";
import { Button } from "@/components/ui/Button";
import { NoticeCard, Tag } from "@/components/ui/Notice";

/**
 * État du profil : le pourcentage est réellement calculé à partir des
 * champs disponibles (photo, description, compétences, langues,
 * université, niveau d'étude, tarif horaire, portfolio, disponibilité —
 * cf. calculerCompletionProfil). Aucune valeur arbitraire.
 */
export function ProfilCompletion({
  completion,
}: {
  completion: CompletionProfil;
}) {
  const t = useTranslations("dashboardPages.profileCompletion");
  const tc = useTranslations("dashboardPages.dashboardLib.completion");
  const complet = completion.pourcentage >= 100;

  return (
    <NoticeCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold">{t("title")}</p>

        <p className="font-mono text-sm font-semibold text-ink">
          {completion.pourcentage} %
        </p>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={completion.pourcentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("progressLabel")}
      >
        <div
          className="h-full rounded-full bg-ocre"
          style={{ width: `${completion.pourcentage}%` }}
        />
      </div>

      {completion.champsManquants.length > 0 ? (
        <>
          <p className="text-sm text-ink-soft">
            {t("hint")}
          </p>

          <ul className="flex flex-wrap gap-1.5" aria-label={t("missingFields")}>
            {completion.champsManquants.map((champ) => (
              <li key={champ}>
                <Tag tone="ocre">{tc(champ as never)}</Tag>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm font-medium text-rice">
          {t("complete")}
        </p>
      )}

      <Link
        href={complet ? "/tableau-de-bord/profil" : "/completer-profil"}
        className="self-start"
        aria-label={complet ? t("viewProfile") : t("completeProfile")}
      >
        <Button size="sm" variant={complet ? "ghost" : "secondary"}>
          {complet ? t("viewProfile") : t("completeProfile")}
        </Button>
      </Link>
    </NoticeCard>
  );
}
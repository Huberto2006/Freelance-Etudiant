"use client";

import Link from "next/link";
import { clsx } from "clsx";

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
  const complet = completion.pourcentage >= 100;

  return (
    <NoticeCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold">Votre profil</p>

        <p className="font-mono text-sm font-semibold text-rice">
          {completion.pourcentage} %
        </p>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={completion.pourcentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Complétion de votre profil"
      >
        <div
          className={clsx(
            "h-full rounded-full",
            complet ? "bg-rice" : "bg-ocre",
          )}
          style={{ width: `${completion.pourcentage}%` }}
        />
      </div>

      {completion.champsManquants.length > 0 ? (
        <>
          <p className="text-sm text-ink-soft">
            Ajoutez ces éléments pour améliorer votre visibilité auprès des
            clients.
          </p>

          <ul className="flex flex-wrap gap-1.5" aria-label="Champs manquants">
            {completion.champsManquants.map((champ) => (
              <li key={champ}>
                <Tag tone="ocre">{champ}</Tag>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm font-medium text-rice">
          Votre profil est complet. Merci !
        </p>
      )}

      <Link
        href="/tableau-de-bord/profil"
        className="self-start"
        aria-label={complet ? "Voir mon profil" : "Compléter mon profil"}
      >
        <Button size="sm" variant={complet ? "ghost" : "secondary"}>
          {complet ? "Voir mon profil" : "Compléter mon profil"}
        </Button>
      </Link>
    </NoticeCard>
  );
}

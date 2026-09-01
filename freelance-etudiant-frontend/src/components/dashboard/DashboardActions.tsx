"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

import type { ActionUrgente, Ton } from "@/lib/dashboard";
import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";

const MEDEAILLONS: Record<Ton, string> = {
  ocre: "bg-ocre/10 text-ocre-dark",
  rice: "bg-rice/10 text-rice",
  brique: "bg-brique/10 text-brique",
  ink: "bg-ink/10 text-ink",
};

function Medaillon({ action }: { action: ActionUrgente }) {
  const Icone = action.icone;
  return (
    <span
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        MEDEAILLONS[action.ton],
      )}
      aria-hidden="true"
    >
      <Icone size={18} />
    </span>
  );
}

/**
 * Bloc d'actions du tableau de bord.
 *
 * - variante « priorite » : liste « À faire maintenant », triée par
 *   priorité, avec état vide positif quand tout est à jour ;
 * - variante « rapide » : grille de raccourcis (actions rapides client).
 */
export function DashboardActions({
  actions,
  variante = "priorite",
  libelleVide = "Rien d'urgent",
  descriptionVide = "Votre activité est à jour.",
}: {
  actions: ActionUrgente[];
  variante?: "priorite" | "rapide";
  libelleVide?: string;
  descriptionVide?: string;
}) {
  if (actions.length === 0) {
    if (variante === "rapide") return null;

    return (
      <NoticeCard className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rice/10 text-rice"
          aria-hidden="true"
        >
          <CheckCircle2 size={18} />
        </span>

        <div>
          <p className="font-display font-medium">{libelleVide}</p>
          <p className="text-sm text-ink-soft">{descriptionVide}</p>
        </div>
      </NoticeCard>
    );
  }

  if (variante === "rapide") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <NoticeCard key={action.id} className="flex flex-col gap-2">
            <Medaillon action={action} />

            <p className="font-display font-semibold">{action.titre}</p>
            <p className="text-sm text-ink-soft">{action.description}</p>

            <Link
              href={action.href}
              className="mt-auto self-start"
              aria-label={`${action.libelleAction} — ${action.titre}`}
            >
              <Button size="sm" variant="ghost">
                {action.libelleAction}
              </Button>
            </Link>
          </NoticeCard>
        ))}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {actions.map((action) => (
        <li key={action.id}>
          <NoticeCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Medaillon action={action} />

              <div className="min-w-0">
                <p className="font-display font-semibold">{action.titre}</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {action.description}
                </p>
              </div>
            </div>

            <Link
              href={action.href}
              className="shrink-0 self-start sm:self-center"
              aria-label={`${action.libelleAction} — ${action.titre}`}
            >
              <Button size="sm">{action.libelleAction}</Button>
            </Link>
          </NoticeCard>
        </li>
      ))}
    </ul>
  );
}

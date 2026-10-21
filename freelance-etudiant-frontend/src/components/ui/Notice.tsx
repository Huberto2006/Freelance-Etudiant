import { clsx } from "clsx";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

export function NoticeCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={clsx("notice-card p-5", className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function StampBadge({
  score,
  size = 64,
}: {
  score: number;
  size?: number;
}) {
  const arrondi = Math.round(score);

  return (
    <div
      className="stamp shrink-0"
      style={{ width: size, height: size }}
      title={`Score de reputation : ${arrondi}/100`}
    >
      <span className="text-lg font-bold leading-none">{arrondi}</span>
      <span className="mt-0.5 text-[0.625rem] uppercase tracking-wider">
        score
      </span>
    </div>
  );
}

export type ToneTag = "ink" | "ocre" | "rice" | "brique" | "bleu";

export function Tag({
  children,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  tone?: ToneTag;
  className?: string;
}) {
  const tones: Record<ToneTag, string> = {
    ink: "border-ink/30 text-ink",
    ocre: "border-ocre-dark/50 text-ocre-dark bg-ocre/10",
    rice: "border-rice/50 text-rice bg-rice/10",
    brique: "border-brique/50 text-brique bg-brique/10",
    bleu: "border-bleu-dark/40 text-bleu-dark bg-bleu-soft",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/*
 * ============================================================
 * BADGES DE STATUT — source unique pour toute l'application
 * ============================================================
 */

const TONS_PAR_STATUT: Record<string, ToneTag> = {
  // Missions
  ouverte: "bleu",
  en_cours: "rice",
  terminee: "ink",
  fermee: "ink",
  expiree: "brique",

  // Candidatures / demandes de service / invitations
  en_attente: "ocre",
  acceptee: "rice",
  refusee: "brique",

  // Livraisons
  validee: "rice",
  correction_demandee: "brique",

  // Transactions / paiements
  confirmee: "rice",
  liberee: "rice",
  annulee: "brique",

  // Services
  disponible: "bleu",

  // Signalements (admin)
  ouvert: "bleu",
  traite: "rice",
};

export function toneStatut(statut: string): ToneTag {
  return TONS_PAR_STATUT[statut] ?? "ink";
}

export function BadgeStatut({
  statut,
  labels,
  className,
}: {
  statut: string;
  labels: Record<string, string>;
  className?: string;
}) {
  return (
    <Tag tone={toneStatut(statut)} className={className}>
      {labels[statut] ?? statut}
    </Tag>
  );
}

export function SousTitreSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={clsx("mb-4 font-display text-lg font-semibold", className)}>
      {children}
    </h2>
  );
}

export function MessageVide({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={clsx("text-sm text-ink-soft/70", className)}>
      {children}
    </p>
  );
}

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  tone = "ocre",
  className,
}: {
  icon: ComponentType<LucideProps>;
  eyebrow: string;
  title: ReactNode;
  tone?: "ocre" | "rice" | "brique" | "ink";
  className?: string;
}) {
  const tones: Record<string, string> = {
    ocre: "bg-ocre/10 text-ocre-dark",
    rice: "bg-rice/10 text-rice",
    brique: "bg-brique/10 text-brique",
    ink: "bg-ink/10 text-ink",
  };

  return (
    <div className={clsx("mb-7 flex items-center gap-3", className)}>
      <span
        className={clsx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          tones[tone],
        )}
        aria-hidden="true"
      >
        <Icon size={20} />
      </span>

      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
      </div>
    </div>
  );
}

export function EtatVide({
  icon: Icon,
  children,
  action,
  className,
}: {
  icon: ComponentType<LucideProps>;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <NoticeCard
      className={clsx(
        "flex flex-col items-center gap-3 py-8 text-center",
        className,
      )}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-soft"
        aria-hidden="true"
      >
        <Icon size={22} />
      </span>

      <p className="text-sm text-ink-soft/70">{children}</p>

      {action}
    </NoticeCard>
  );
}

export function ChargementPage({ className }: { className?: string }) {
  return (
    <p className={clsx("text-sm text-ink-soft", className)}>
      Chargement…
    </p>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = "ocre",
  className,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  tone?: "ocre" | "rice" | "brique" | "ink";
  className?: string;
}) {
  const tones: Record<string, string> = {
    ocre: "bg-ocre/10 text-ocre-dark",
    rice: "bg-rice/10 text-rice",
    brique: "bg-brique/10 text-brique",
    ink: "bg-ink/10 text-ink",
  };

  return (
    <NoticeCard className={clsx("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2.5">
        <span
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tones[tone],
          )}
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={2} />
        </span>

        <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
          {label}
        </p>
      </div>

      <p className="font-display text-3xl leading-none">{value}</p>

      {sublabel && (
        <p className="text-xs text-ink-soft/70">{sublabel}</p>
      )}
    </NoticeCard>
  );
}
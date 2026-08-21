import { clsx } from "clsx";
import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

export function NoticeCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("notice-card p-5", className)}>
      <span className="notice-pin" aria-hidden="true" />
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
      <span className="text-[8px] uppercase tracking-wider mt-0.5">score</span>
    </div>
  );
}

export function Tag({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ink" | "ocre" | "rice" | "brique";
}) {
  const tones: Record<string, string> = {
    ink: "border-ink/30 text-ink",
    ocre: "border-ocre-dark/50 text-ocre-dark bg-ocre/10",
    rice: "border-rice/50 text-rice bg-rice/10",
    brique: "border-brique/50 text-brique bg-brique/10",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/**
 * En-tete de page standard : medaillon-icone + eyebrow + titre.
 * Reprend le meme rythme visuel sur tout le tableau de bord.
 */
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
    <div className={clsx("mb-8 flex items-center gap-3", className)}>
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
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-1">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
      </div>
    </div>
  );
}

/**
 * Carte de statistique "punaisee" : icone dans un medaillon,
 * label mono, grande valeur en display, et une sous-legende
 * optionnelle. Base de toutes les tuiles de statistiques.
 */
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
        <p className="text-xs font-mono uppercase tracking-wider text-ink-soft">
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

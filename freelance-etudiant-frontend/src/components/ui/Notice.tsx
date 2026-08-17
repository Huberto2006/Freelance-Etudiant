import { clsx } from "clsx";
import type { ReactNode } from "react";

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
        "inline-flex items-center border px-2 py-0.5 text-xs font-mono uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

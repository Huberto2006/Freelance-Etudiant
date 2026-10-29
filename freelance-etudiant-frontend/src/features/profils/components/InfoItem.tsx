"use client";

/* =========================================================
   COMPOSANT INFORMATION
========================================================= */

export function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
        <Icon size={17} />
      </span>

      <div>
        <p className="text-xs uppercase tracking-wider text-ink-soft">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

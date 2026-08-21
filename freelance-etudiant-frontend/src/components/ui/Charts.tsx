"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NoticeCard } from "@/components/ui/Notice";

const PALETTE = [
  "var(--color-ocre)",
  "var(--color-rice)",
  "var(--color-brique)",
  "var(--color-ocre-dark)",
  "var(--color-rice-light)",
  "var(--color-brique-light)",
];

function InfoBulle({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-ink/20 bg-paper-light px-3 py-2 text-xs shadow-lg">
      {label && (
        <p className="mb-1 font-mono uppercase tracking-wider text-ink-soft">
          {label}
        </p>
      )}
      {payload.map((item, i) => (
        <p key={item.name ?? i} className="font-display text-sm text-ink">
          {item.value?.toLocaleString("fr-FR")}
        </p>
      ))}
    </div>
  );
}

/**
 * Histogramme "revenus mensuels" (ou toute serie mois -> valeur).
 */
export function BarreMensuelle({
  titre,
  sous_titre,
  donnees,
  cleValeur = "valeur",
  cleLabel = "label",
  couleur = "var(--color-ocre)",
  formatValeur,
}: {
  titre: string;
  sous_titre?: string;
  donnees: Array<Record<string, string | number>>;
  cleValeur?: string;
  cleLabel?: string;
  couleur?: string;
  formatValeur?: (v: number) => string;
}) {
  const vide = !donnees || donnees.length === 0 || donnees.every((d) => Number(d[cleValeur]) === 0);

  return (
    <NoticeCard className="sm:col-span-3">
      <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
        {titre}
      </p>
      {sous_titre && (
        <p className="text-xs text-ink-soft/70 mb-3">{sous_titre}</p>
      )}
      {vide ? (
        <p className="py-10 text-center text-sm text-ink-soft/70">
          Pas encore de données à afficher.
        </p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={donnees} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                stroke="var(--color-ink)"
                strokeOpacity={0.08}
              />
              <XAxis
                dataKey={cleLabel}
                tick={{ fill: "var(--color-ink-soft)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                axisLine={{ stroke: "var(--color-ink)", strokeOpacity: 0.15 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-ink-soft)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={formatValeur}
              />
              <Tooltip
                cursor={{ fill: "var(--color-ink)", fillOpacity: 0.06 }}
                content={<InfoBulle />}
              />
              <Bar dataKey={cleValeur} fill={couleur} radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </NoticeCard>
  );
}

/**
 * Diagramme en anneau : repartition d'un total par categorie.
 */
export function AnneauRepartition({
  titre,
  sous_titre,
  donnees,
  cleValeur = "total",
  cleLabel = "categorie",
}: {
  titre: string;
  sous_titre?: string;
  donnees: Array<Record<string, string | number>>;
  cleValeur?: string;
  cleLabel?: string;
}) {
  const total = donnees.reduce((s, d) => s + Number(d[cleValeur] || 0), 0);

  return (
    <NoticeCard className="sm:col-span-3">
      <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">
        {titre}
      </p>
      {sous_titre && (
        <p className="text-xs text-ink-soft/70 mb-3">{sous_titre}</p>
      )}
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft/70">
          Pas encore de données à afficher.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donnees}
                  dataKey={cleValeur}
                  nameKey={cleLabel}
                  innerRadius="62%"
                  outerRadius="95%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {donnees.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<InfoBulle />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex w-full flex-col gap-2">
            {donnees.map((d, i) => (
              <li
                key={String(d[cleLabel])}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 text-ink-soft">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    aria-hidden="true"
                  />
                  {d[cleLabel]}
                </span>
                <span className="font-mono text-ink">
                  {d[cleValeur]}
                  <span className="text-ink-soft/60">
                    {" "}
                    · {Math.round((Number(d[cleValeur]) / total) * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </NoticeCard>
  );
}

/**
 * Jauge circulaire pour un pourcentage unique
 * (ex. taux d'acceptation, taux de completion).
 */
export function JaugeCirculaire({
  valeur,
  label,
  couleur = "var(--color-rice)",
  size = 96,
}: {
  valeur: number;
  label: ReactNode;
  couleur?: string;
  size?: number;
}) {
  const bornee = Math.max(0, Math.min(100, valeur));
  const donnees = [
    { name: "acquis", v: bornee },
    { name: "reste", v: 100 - bornee },
  ];

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: size, height: size }} className="relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donnees}
              dataKey="v"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              <Cell fill={couleur} />
              <Cell fill="var(--color-ink)" fillOpacity={0.08} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-lg font-semibold">
            {Math.round(bornee)}%
          </span>
        </div>
      </div>
      <p className="text-xs font-mono uppercase tracking-wider text-ink-soft">
        {label}
      </p>
    </div>
  );
}

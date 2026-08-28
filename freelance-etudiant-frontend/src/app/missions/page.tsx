"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import type { Mission } from "@/lib/types";

import { BarreRecherche, type Filtres } from "@/components/ui/BarreRecherche";
import { CarteMission } from "@/components/ui/CarteMission";
import { NoticeCard } from "@/components/ui/Notice";

export default function MissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <p className="text-sm text-ink-soft">Chargement…</p>
        </div>
      }
    >
      <MissionsContent />
    </Suspense>
  );
}

function MissionsContent() {
  const searchParams = useSearchParams();
  const cleParams = searchParams.toString();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [chargement, setChargement] = useState(true);

  const rechercher = useCallback(async (filtres: Filtres = {}) => {
    setChargement(true);

    const params = new URLSearchParams();

    if (filtres.motsCles) params.set("motsCles", filtres.motsCles);
    if (filtres.categorie) params.set("categorie", filtres.categorie);
    if (filtres.competence) params.set("competence", filtres.competence);
    if (filtres.budgetMin) params.set("budgetMin", filtres.budgetMin);
    if (filtres.budgetMax) params.set("budgetMax", filtres.budgetMax);

    try {
      const data = await api.get(`/missions?${params.toString()}`, {
        auth: false,
      }) as Mission[];

      setMissions(data);
    } finally {
      setChargement(false);
    }
  }, []);

  /*
   * Les filtres proviennent de l'URL : recherche du hero ou de la navbar
   * (/missions?q=...) ou filtres avances de la barre de recherche. Le
   * chargement est differe d'un tick pour eviter un setState synchrone
   * dans l'effet (meme convention que le tableau de bord).
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      rechercher({
        motsCles: searchParams.get("q") ?? undefined,
        categorie: searchParams.get("categorie") ?? undefined,
        competence: searchParams.get("competence") ?? undefined,
        budgetMin: searchParams.get("budgetMin") ?? undefined,
        budgetMax: searchParams.get("budgetMax") ?? undefined,
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercher, cleParams]);

  // Valeurs pre-remplies de la barre de recherche au premier montage.
  const filtresInitiaux: Filtres = {
    motsCles: searchParams.get("q") ?? undefined,
    categorie: searchParams.get("categorie") ?? undefined,
    competence: searchParams.get("competence") ?? undefined,
    budgetMin: searchParams.get("budgetMin") ?? undefined,
    budgetMax: searchParams.get("budgetMax") ?? undefined,
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      {/* ---------------------------------------- EN-TETE */}
      <div className="mb-8">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
          Panneau d&apos;affichage
        </p>
        <h1 className="font-display text-3xl font-bold">Missions</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {chargement
            ? "Chargement des missions…"
            : `${missions.length} mission${missions.length > 1 ? "s" : ""} ouverte${missions.length > 1 ? "s" : ""} aux candidatures`}
        </p>
      </div>

      {/* ---------------------------------------- RECHERCHE */}
      <BarreRecherche
        onFiltrer={rechercher}
        filtresInitiaux={filtresInitiaux}
        placeholder="Site vitrine, gestion scolaire…"
        avecBudget
      />

      {/* ---------------------------------------- RESULTATS */}
      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : missions.length === 0 ? (
        <NoticeCard>
          Aucune mission ne correspond à ces critères pour le moment.
        </NoticeCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {missions.map((mission) => (
            <CarteMission key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </div>
  );
}
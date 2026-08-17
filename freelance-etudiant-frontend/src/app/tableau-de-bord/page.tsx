"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { NoticeCard, StampBadge } from "@/components/ui/Notice";
import { formatArgent } from "@/lib/format";

interface StatsAdmin {
  nombreInscrits: { etudiants: number; clients: number; total: number };
  volumeAffairesGlobal: number;
  repartitionMissionsParCategorie: { categorie: string; total: number }[];
  missions: { total: number; terminees: number };
}

interface StatsEtudiant {
  revenusMensuels: { mois: string; revenu: number }[];
  tauxAcceptationCandidatures: number;
  missionsEnCours: number;
  totalCandidatures: number;
}

export default function TableauDeBordVueEnsemble() {
  const { utilisateur } = useAuth();
  const [statsAdmin, setStatsAdmin] = useState<StatsAdmin | null>(null);
  const [statsEtudiant, setStatsEtudiant] = useState<StatsEtudiant | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!utilisateur) return;
    if (utilisateur.role === "admin") {
      api
        .get<StatsAdmin>("/statistiques/admin")
        .then(setStatsAdmin)
        .finally(() => setChargement(false));
    } else if (utilisateur.role === "etudiant") {
      api
        .get<StatsEtudiant>("/statistiques/etudiant/me")
        .then(setStatsEtudiant)
        .finally(() => setChargement(false));
    } else {
      setChargement(false);
    }
  }, [utilisateur]);

  if (!utilisateur) return null;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-2">
        Tableau de bord
      </p>
      <h1 className="font-display text-3xl font-semibold mb-8">
        Bonjour, {utilisateur.nom.split(" ")[0]}
      </h1>

      {utilisateur.role === "etudiant" && utilisateur.profilEtudiant && (
        <NoticeCard className="mb-8 flex items-center gap-5">
          <StampBadge
            score={Number(utilisateur.profilEtudiant.scoreReputation) || 0}
            size={72}
          />
          <div>
            <p className="font-display text-lg font-medium">
              Score de réputation
            </p>
            <p className="text-sm text-ink-soft">
              {utilisateur.profilEtudiant.nombreMissionsTerminees} projet(s)
              livré(s) · note moyenne{" "}
              {Number(utilisateur.profilEtudiant.noteMoyenne).toFixed(1)}/5
            </p>
          </div>
        </NoticeCard>
      )}

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement des statistiques…</p>
      ) : (
        <>
          {statsEtudiant && (
            <div className="grid gap-4 sm:grid-cols-3">
              <NoticeCard>
                <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-2">
                  Missions en cours
                </p>
                <p className="font-display text-3xl">
                  {statsEtudiant.missionsEnCours}
                </p>
              </NoticeCard>
              <NoticeCard>
                <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-2">
                  Taux d&apos;acceptation
                </p>
                <p className="font-display text-3xl">
                  {statsEtudiant.tauxAcceptationCandidatures}%
                </p>
              </NoticeCard>
              <NoticeCard>
                <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-2">
                  Candidatures envoyées
                </p>
                <p className="font-display text-3xl">
                  {statsEtudiant.totalCandidatures}
                </p>
              </NoticeCard>
            </div>
          )}

          {statsAdmin && (
            <div className="grid gap-4 sm:grid-cols-3">
              <NoticeCard>
                <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-2">
                  Utilisateurs inscrits
                </p>
                <p className="font-display text-3xl">
                  {statsAdmin.nombreInscrits.total}
                </p>
                <p className="text-xs text-ink-soft/70 mt-1">
                  {statsAdmin.nombreInscrits.etudiants} étudiants ·{" "}
                  {statsAdmin.nombreInscrits.clients} clients
                </p>
              </NoticeCard>
              <NoticeCard>
                <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-2">
                  Volume d&apos;affaires
                </p>
                <p className="font-display text-2xl">
                  {formatArgent(statsAdmin.volumeAffairesGlobal)}
                </p>
              </NoticeCard>
              <NoticeCard>
                <p className="text-xs font-mono uppercase tracking-wider text-ink-soft mb-2">
                  Missions
                </p>
                <p className="font-display text-3xl">
                  {statsAdmin.missions.terminees}/{statsAdmin.missions.total}
                </p>
                <p className="text-xs text-ink-soft/70 mt-1">terminées</p>
              </NoticeCard>
            </div>
          )}

          {utilisateur.role === "client" && (
            <NoticeCard>
              <p className="text-sm text-ink-soft">
                Retrouvez vos missions publiées et les candidatures reçues
                dans l&apos;onglet <strong>Mes missions</strong>.
              </p>
            </NoticeCard>
          )}
        </>
      )}
    </div>
  );
}

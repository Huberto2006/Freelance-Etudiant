"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Utilisateur } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { roleLabel } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { NoticeCard, Tag } from "@/components/ui/Notice";

export default function AdminPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const data = await api.get<Utilisateur[]>("/admin/utilisateurs");
      setUtilisateurs(data);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function suspendre(id: string) {
    await api.patch(`/admin/utilisateurs/${id}/suspendre`);
    charger();
  }

  async function reactiver(id: string) {
    await api.patch(`/admin/utilisateurs/${id}/reactiver`);
    charger();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-8">
        Administration — Utilisateurs
      </h1>

      {chargement ? (
        <p className="text-sm text-ink-soft">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {utilisateurs.map((u) => (
            <NoticeCard key={u.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-display font-medium">{u.nom}</p>
                  <Tag tone="ink">{roleLabel(u.role)}</Tag>
                  {u.estSuspendu && <Tag tone="brique">Suspendu</Tag>}
                </div>
                <p className="text-xs text-ink-soft/70">
                  {u.email} · inscrit le {formatDate(u.dateInscription)}
                </p>
              </div>
              {u.role !== "admin" && (
                <Button
                  size="sm"
                  variant={u.estSuspendu ? "secondary" : "danger"}
                  onClick={() =>
                    u.estSuspendu ? reactiver(u.id) : suspendre(u.id)
                  }
                >
                  {u.estSuspendu ? "Réactiver" : "Suspendre"}
                </Button>
              )}
            </NoticeCard>
          ))}
        </div>
      )}
    </div>
  );
}

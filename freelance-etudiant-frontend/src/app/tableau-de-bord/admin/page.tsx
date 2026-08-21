"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Mail, CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import type { Utilisateur } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { roleLabel } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";

export default function AdminPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Recharge la liste des utilisateurs.
   * Utilisée après une suspension ou une réactivation.
   */
  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const data = await api.get<Utilisateur[]>(
        "/admin/utilisateurs"
      );

      setUtilisateurs(data);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des utilisateurs :",
        error
      );

      setErreur(
        "Impossible de charger la liste des utilisateurs."
      );
    } finally {
      setChargement(false);
    }
  }, []);

  /**
   * Chargement initial.
   *
   * On ne fait pas appel à charger() ici car celui-ci
   * modifie immédiatement l'état avec setChargement(true).
   */
  useEffect(() => {
    let cancelled = false;

    const chargerInitial = async () => {
      try {
        const data = await api.get<Utilisateur[]>(
          "/admin/utilisateurs"
        );

        if (!cancelled) {
          setUtilisateurs(data);
          setErreur(null);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement initial :",
          error
        );

        if (!cancelled) {
          setErreur(
            "Impossible de charger la liste des utilisateurs."
          );
        }
      } finally {
        if (!cancelled) {
          setChargement(false);
        }
      }
    };

    chargerInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Suspendre un utilisateur.
   */
  async function suspendre(id: string) {
    try {
      await api.patch(
        `/admin/utilisateurs/${id}/suspendre`
      );

      await charger();
    } catch (error) {
      console.error(
        "Erreur lors de la suspension :",
        error
      );

      setErreur(
        "Impossible de suspendre cet utilisateur."
      );
    }
  }

  /**
   * Réactiver un utilisateur.
   */
  async function reactiver(id: string) {
    try {
      await api.patch(
        `/admin/utilisateurs/${id}/reactiver`
      );

      await charger();
    } catch (error) {
      console.error(
        "Erreur lors de la réactivation :",
        error
      );

      setErreur(
        "Impossible de réactiver cet utilisateur."
      );
    }
  }

  return (
    <div>
      {/* Titre */}
      <PageHeader icon={ShieldCheck} eyebrow="Administration" title="Utilisateurs" />

      {/* Erreur */}
      {erreur && (
        <NoticeCard className="mb-6 border-brique/30">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* Chargement */}
      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      ) : utilisateurs.length === 0 ? (
        /* Aucun utilisateur */
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Aucun utilisateur trouvé.
          </p>
        </NoticeCard>
      ) : (
        /* Liste des utilisateurs */
        <div className="flex flex-col gap-3">
          {utilisateurs.map((u) => (
            <NoticeCard
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              {/* Informations utilisateur */}
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-display font-medium">
                    {u.nom}
                  </p>

                  <Tag tone="ink">
                    {roleLabel(u.role)}
                  </Tag>

                  {u.estSuspendu && (
                    <Tag tone="brique">
                      <ShieldAlert size={11} className="mr-1" />
                      Suspendu
                    </Tag>
                  )}
                </div>

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft/70">
                  <span className="inline-flex items-center gap-1">
                    <Mail size={12} />
                    {u.email}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} />
                    inscrit le {formatDate(u.dateInscription)}
                  </span>
                </p>
              </div>

              {/* Actions */}
              {u.role !== "admin" && (
                <Button
                  size="sm"
                  variant={
                    u.estSuspendu
                      ? "secondary"
                      : "danger"
                  }
                  onClick={() =>
                    u.estSuspendu
                      ? reactiver(u.id)
                      : suspendre(u.id)
                  }
                >
                  {u.estSuspendu
                    ? "Réactiver"
                    : "Suspendre"}
                </Button>
              )}
            </NoticeCard>
          ))}
        </div>
      )}
    </div>
  );
}
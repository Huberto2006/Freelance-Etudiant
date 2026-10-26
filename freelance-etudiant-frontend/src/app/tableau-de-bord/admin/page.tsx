"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, ShieldAlert, Mail, CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import type { Utilisateur } from "@/lib/types";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useApiList } from "@/hooks/useApiList";
import { Button } from "@/components/ui/Button";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { date } = useFormats();
  const { role } = useLabels();
  // L'ancienne version de cette page dupliquait cette meme requete deux
  // fois (un useEffect pour le chargement initial, un charger() distinct
  // pour le rechargement apres action) : deux copies du meme code, deja
  // legerement divergentes (l'une gerait l'annulation, l'autre non).
  // useApiList centralise les deux en un seul endroit.
  const {
    donnees,
    chargement,
    erreur,
    setErreur,
    recharger: charger,
  } = useApiList(() => api.get<Utilisateur[]>("/admin/utilisateurs"));
  const utilisateurs = donnees ?? [];

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
        t("users.suspendError")
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
        t("users.reactivateError")
      );
    }
  }

  return (
    <div>
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord" forcer />
      </div>

      {/* Titre */}
      <PageHeader icon={ShieldCheck} eyebrow={t("eyebrow")} title={t("users.title")} />

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
          {t("users.loading")}
        </p>
      ) : utilisateurs.length === 0 ? (
        /* Aucun utilisateur */
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {t("users.empty")}
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
                    {role(u.role)}
                  </Tag>

                  {u.estSuspendu && (
                    <Tag tone="brique">
                      <ShieldAlert size={11} className="mr-1" />
                      {t("users.suspended")}
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
                    {t("users.registeredOn", { date: date(u.dateInscription) })}
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
                    ? t("users.reactivate")
                    : t("users.suspend")}
                </Button>
              )}
            </NoticeCard>
          ))}
        </div>
      )}
    </div>
  );
}
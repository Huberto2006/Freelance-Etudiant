"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ShieldCheck, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Utilisateur } from "@/lib/types";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useApiList } from "@/hooks/useApiList";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select } from "@/components/ui/Field";
import { EtatVide, NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { BoutonRetour } from "@/components/ui/BoutonRetour";

type EtatCompte = "actif" | "suspendu" | "inactif";

/** État réel du compte, tel que renvoyé par le backend (aucun statut inventé). */
function etatCompte(utilisateur: Utilisateur): EtatCompte {
  if (utilisateur.estSuspendu) return "suspendu";
  if (!utilisateur.estActif) return "inactif";
  return "actif";
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { date } = useFormats();
  const { role } = useLabels();
  const toast = useToast();

  // useApiList conserve `donnees` pendant un rechargement : la liste reste
  // affichée après une action au lieu de repasser par un écran de chargement.
  const {
    donnees,
    chargement,
    erreur,
    recharger,
  } = useApiList(() => api.get<Utilisateur[]>("/admin/utilisateurs"));
  const utilisateurs = useMemo(() => donnees ?? [], [donnees]);

  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("");
  const [filtreEtat, setFiltreEtat] = useState<"" | EtatCompte>("");
  // Identifiant de l'utilisateur dont une requête est réellement en cours.
  const [enCours, setEnCours] = useState<string | null>(null);
  const [aSuspendre, setASuspendre] = useState<Utilisateur | null>(null);

  // Les rôles proposés au filtre viennent des données : aucun rôle codé en dur.
  const roles = useMemo(
    () => [...new Set(utilisateurs.map((u) => u.role))],
    [utilisateurs],
  );

  const visibles = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return utilisateurs.filter(
      (u) =>
        (!terme ||
          u.nom.toLowerCase().includes(terme) ||
          u.email.toLowerCase().includes(terme)) &&
        (!filtreRole || u.role === filtreRole) &&
        (!filtreEtat || etatCompte(u) === filtreEtat),
    );
  }, [utilisateurs, recherche, filtreRole, filtreEtat]);

  const filtresActifs = Boolean(recherche || filtreRole || filtreEtat);

  /**
   * Suspend ou réactive un compte. La notification de succès n'est émise
   * qu'après la réponse positive du backend ; en cas d'échec, l'erreur
   * (message du backend si disponible) est affichée à la place.
   */
  async function changerSuspension(utilisateur: Utilisateur, suspendre: boolean) {
    setEnCours(utilisateur.id);
    try {
      await api.patch(
        `/admin/utilisateurs/${utilisateur.id}/${suspendre ? "suspendre" : "reactiver"}`,
      );
      toast.succes(
        t(suspendre ? "users.suspendedToast" : "users.reactivatedToast", {
          nom: utilisateur.nom,
        }),
      );
      await recharger();
    } catch (error) {
      toast.erreur(
        t(suspendre ? "users.suspendError" : "users.reactivateError"),
        error instanceof ApiError ? error.message : undefined,
      );
    } finally {
      setEnCours(null);
      setASuspendre(null);
    }
  }

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreRole("");
    setFiltreEtat("");
  }

  const premierChargement = chargement && donnees === null;

  return (
    <div>
      <div className="mb-4">
        <BoutonRetour repli="/tableau-de-bord" forcer />
      </div>

      <PageHeader
        icon={ShieldCheck}
        eyebrow={t("eyebrow")}
        title={t("users.title")}
      />

      {/* Échec de chargement : message du backend + nouvelle tentative */}
      {erreur && (
        <NoticeCard className="mb-4 flex flex-wrap items-center justify-between gap-3 border-brique/30">
          <p role="alert" className="text-sm text-brique">
            {erreur}
          </p>
          <Button
            size="sm"
            variant="ghost"
            loading={chargement}
            onClick={() => void recharger()}
          >
            {tc("actions.retry")}
          </Button>
        </NoticeCard>
      )}

      {premierChargement ? (
        <ChargementTableau />
      ) : utilisateurs.length === 0 ? (
        !erreur && <EtatVide icon={Users}>{t("users.empty")}</EtatVide>
      ) : (
        <>
          {/* Barre d'outils : recherche, filtres, compteur */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <Input
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder={t("users.searchPlaceholder")}
                aria-label={t("users.searchLabel")}
                className="pl-9"
              />
            </div>

            <div className="w-40">
              <Select
                value={filtreRole}
                onChange={(event) => setFiltreRole(event.target.value)}
                aria-label={t("users.roleFilter")}
              >
                <option value="">{t("users.allRoles")}</option>
                {roles.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {role(valeur)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-40">
              <Select
                value={filtreEtat}
                onChange={(event) =>
                  setFiltreEtat(event.target.value as "" | EtatCompte)
                }
                aria-label={t("users.statusFilter")}
              >
                <option value="">{t("users.allStatuses")}</option>
                <option value="actif">{t("users.active")}</option>
                <option value="suspendu">{t("users.suspended")}</option>
                <option value="inactif">{t("users.inactive")}</option>
              </Select>
            </div>

            {filtresActifs && (
              <Button size="sm" variant="ghost" onClick={reinitialiserFiltres}>
                {tc("actions.reset")}
              </Button>
            )}

            <p
              aria-live="polite"
              className="ml-auto text-xs tabular-nums text-ink-soft"
            >
              {t("users.count", { count: visibles.length })}
            </p>
          </div>

          {visibles.length === 0 ? (
            <EtatVide icon={Search}>{t("users.noResults")}</EtatVide>
          ) : (
            <div className="notice-card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] border-collapse text-sm">
                  <caption className="sr-only">{t("users.title")}</caption>
                  <thead>
                    <tr className="border-b border-ink/10 bg-ink/[0.03] text-left text-xs text-ink-soft">
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        {t("users.colUser")}
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-2.5 font-medium sm:table-cell"
                      >
                        {t("users.colRole")}
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-2.5 font-medium md:table-cell"
                      >
                        {t("users.colRegistered")}
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        {t("users.colStatus")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-right font-medium"
                      >
                        {t("users.colActions")}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-ink/10">
                    {visibles.map((u) => {
                      const etat = etatCompte(u);
                      const suspendu = etat === "suspendu";
                      return (
                        <tr
                          key={u.id}
                          className="transition-colors hover:bg-ink/[0.02]"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                nom={u.nom}
                                photoUrl={u.photoUrl}
                                size={32}
                                className="shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">
                                  {u.nom}
                                </p>
                                <p className="truncate text-xs text-ink-soft">
                                  {u.email}
                                </p>
                                {/* Sur mobile, le rôle passe sous l'e-mail
                                    (sa colonne est masquée). */}
                                <p className="text-xs text-ink-soft sm:hidden">
                                  {role(u.role)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="hidden px-4 py-3 sm:table-cell">
                            <Tag tone="ink">{role(u.role)}</Tag>
                          </td>

                          <td className="hidden whitespace-nowrap px-4 py-3 text-xs tabular-nums text-ink-soft md:table-cell">
                            {date(u.dateInscription)}
                          </td>

                          <td className="px-4 py-3">
                            <Tag
                              tone={
                                etat === "actif"
                                  ? "rice"
                                  : etat === "suspendu"
                                    ? "brique"
                                    : "ink"
                              }
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                                aria-hidden="true"
                              />
                              {etat === "actif"
                                ? t("users.active")
                                : etat === "suspendu"
                                  ? t("users.suspended")
                                  : t("users.inactive")}
                            </Tag>
                          </td>

                          <td className="px-4 py-3 text-right">
                            {/* Un administrateur n'est jamais suspendable ici. */}
                            {u.role !== "admin" &&
                              (suspendu ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  loading={enCours === u.id}
                                  disabled={enCours !== null}
                                  onClick={() => void changerSuspension(u, false)}
                                >
                                  {t("users.reactivate")}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="danger-ghost"
                                  disabled={enCours !== null}
                                  onClick={() => setASuspendre(u)}
                                >
                                  {t("users.suspend")}
                                </Button>
                              ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action sensible : suspendre un compte demande une confirmation. */}
      <ConfirmDialog
        ouvert={aSuspendre !== null}
        titre={t("users.suspendTitle", { nom: aSuspendre?.nom ?? "" })}
        description={t("users.suspendDescription")}
        libelleConfirmer={t("users.suspendConfirm")}
        enCours={aSuspendre !== null && enCours === aSuspendre.id}
        onConfirmer={() => {
          if (aSuspendre) void changerSuspension(aSuspendre, true);
        }}
        onAnnuler={() => setASuspendre(null)}
      />
    </div>
  );
}

/** Imitation du tableau pendant le tout premier chargement. */
function ChargementTableau() {
  return (
    <div
      aria-hidden="true"
      className="notice-card divide-y divide-ink/10 overflow-hidden p-0"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton rond className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="mt-2 h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-16 sm:block" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

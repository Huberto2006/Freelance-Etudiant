"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Utilisateur } from "@/types/utilisateurs";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useApiList } from "@/hooks/useApiList";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type ColonneDataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/Field";
import { PageHeader, Tag } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";

type EtatCompte = "actif" | "suspendu" | "inactif";

/** État réel du compte, tel que renvoyé par le backend (aucun statut inventé). */
function etatCompte(utilisateur: Utilisateur): EtatCompte {
  if (utilisateur.estSuspendu) return "suspendu";
  if (!utilisateur.estActif) return "inactif";
  return "actif";
}

export default function AdminPage() {
  const t = useTranslations("admin");
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

  const visibles = useMemo(
    () =>
      utilisateurs.filter(
        (u) =>
          (!filtreRole || u.role === filtreRole) &&
          (!filtreEtat || etatCompte(u) === filtreEtat),
      ),
    [utilisateurs, filtreRole, filtreEtat],
  );

  function libelleEtat(etat: EtatCompte) {
    return etat === "actif"
      ? t("users.active")
      : etat === "suspendu"
        ? t("users.suspended")
        : t("users.inactive");
  }

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
    setFiltreRole("");
    setFiltreEtat("");
  }

  const colonnes: ColonneDataTable<Utilisateur>[] = [
    {
      id: "utilisateur",
      entete: t("users.colUser"),
      valeurTri: (u) => u.nom,
      texteRecherche: (u) => `${u.nom} ${u.email}`,
      cellule: (u) => (
        <div className="flex items-center gap-3">
          <Avatar
            nom={u.nom}
            photoUrl={u.photoUrl}
            size={32}
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{u.nom}</p>
            <p className="truncate text-xs text-ink-soft">{u.email}</p>
            {/* Sur mobile, le rôle passe sous l'e-mail
                (sa colonne est masquée). */}
            <p className="text-xs text-ink-soft sm:hidden">{role(u.role)}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      entete: t("users.colRole"),
      masquerSous: "sm",
      valeurTri: (u) => role(u.role),
      cellule: (u) => <Tag tone="ink">{role(u.role)}</Tag>,
    },
    {
      id: "inscription",
      entete: t("users.colRegistered"),
      masquerSous: "md",
      classeCellule: "whitespace-nowrap text-xs tabular-nums text-ink-soft",
      valeurTri: (u) => new Date(u.dateInscription),
      cellule: (u) => date(u.dateInscription),
    },
    {
      id: "statut",
      entete: t("users.colStatus"),
      valeurTri: (u) => libelleEtat(etatCompte(u)),
      cellule: (u) => {
        const etat = etatCompte(u);
        return (
          <Tag
            tone={
              etat === "actif" ? "rice" : etat === "suspendu" ? "brique" : "ink"
            }
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
              aria-hidden="true"
            />
            {libelleEtat(etat)}
          </Tag>
        );
      },
    },
    {
      id: "actions",
      entete: t("users.colActions"),
      alignement: "droite",
      cellule: (u) =>
        // Un administrateur n'est jamais suspendable ici.
        u.role !== "admin" &&
        (etatCompte(u) === "suspendu" ? (
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
        )),
    },
  ];

  return (
    <div>
      <div className="mb-4">
      </div>

      <PageHeader
        icon={ShieldCheck}
        eyebrow={t("eyebrow")}
        title={t("users.title")}
      />

      {/* useApiList conserve les données : pendant un rechargement, seul le
          tout premier chargement affiche le squelette. */}
      <DataTable
        lignes={visibles}
        colonnes={colonnes}
        cleLigne={(u) => u.id}
        legende={t("users.title")}
        chargement={chargement && donnees === null}
        erreur={erreur}
        onReessayer={() => void recharger()}
        reessaiEnCours={chargement}
        iconeVide={Users}
        messageVide={t("users.empty")}
        messageAucunResultat={t("users.noResults")}
        placeholderRecherche={t("users.searchPlaceholder")}
        libelleRecherche={t("users.searchLabel")}
        filtresActifs={Boolean(filtreRole || filtreEtat)}
        cleFiltres={`${filtreRole}|${filtreEtat}`}
        onReinitialiserFiltres={reinitialiserFiltres}
        filtres={
          <>
            <div className="w-[calc(50%-0.25rem)] sm:w-36">
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
            <div className="w-[calc(50%-0.25rem)] sm:w-36">
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
          </>
        }
      />

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

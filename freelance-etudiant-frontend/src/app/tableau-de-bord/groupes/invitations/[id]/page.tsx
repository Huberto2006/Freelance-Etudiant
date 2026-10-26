"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Users, X } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { EtudiantProfile, Groupe, InvitationGroupe } from "@/lib/types";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";

import { Button } from "@/components/ui/Button";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { Avatar } from "@/components/ui/Avatar";

export default function InvitationGroupePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("dashboardPages.groupInvitation");
  const { date: formatDate } = useFormats();
  const { statutInvitationGroupe } = useLabels();
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationGroupe | null>(null);
  const [chargement, setChargement] = useState(true);
  const [traitement, setTraitement] = useState<"accepter" | "refuser" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [groupe, setGroupe] = useState<Groupe | null>(null);
  const [inviteur, setInviteur] = useState<EtudiantProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function charger() {
      try {
        const data = await api.get<InvitationGroupe>(
          `/groupes/invitations/${id}`,
        );
        if (!cancelled) {
          setInvitation(data);
          const [detail, profil] = await Promise.all([
            data.statut === "acceptee"
              ? api.get<Groupe>(`/groupes/${data.groupeId}`).catch(() => null)
              : Promise.resolve(null),
            api.get<EtudiantProfile>(`/etudiants/${data.inviteurId}`).catch(() => null),
          ]);
          if (!cancelled) {
            setGroupe(detail);
            setInviteur(profil);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) setChargement(false);
      }
    }

    void charger();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  async function traiter(action: "accepter" | "refuser") {
    setTraitement(action);
    setErreur(null);
    setSucces(null);

    try {
      await api.post(
        `/groupes/invitations/${id}/${action === "accepter" ? "accepter" : "refuser"}`,
      );
      setInvitation((actuelle) =>
        actuelle
          ? {
              ...actuelle,
              statut: action === "accepter" ? "acceptee" : "refusee",
            }
          : actuelle,
      );
      setSucces(
        action === "accepter"
          ? t("joined")
          : t("refused"),
      );
        if (action === "accepter") {
          window.setTimeout(() => {
            router.push(`/tableau-de-bord/groupes/${invitation?.groupeId}`);
          }, 700);
        }
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : t("processError"),
      );
    } finally {
      setTraitement(null);
    }
  }

  if (chargement) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        {t("loading")}
      </p>
    );
  }

  if (!invitation) {
    return (
      <div className="mx-auto max-w-2xl">
        <BoutonRetour repli="/tableau-de-bord/notifications" className="mb-6" />
        <NoticeCard>
          <p className="text-sm text-brique">
            {erreur ?? t("notFound")}
          </p>
        </NoticeCard>
      </div>
    );
  }

  const estEnAttente = invitation.statut === "en_attente";
  const tonStatut = estEnAttente
    ? "ocre"
    : invitation.statut === "acceptee"
      ? "rice"
      : "brique";

  return (
    <div className="mx-auto max-w-2xl">
      <BoutonRetour repli="/tableau-de-bord/notifications" className="mb-6" />

      <PageHeader
        icon={Users}
        eyebrow={t("eyebrow")}
        title={invitation.groupe?.nom ?? t("joinGroup")}
      />

      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">{erreur}</p>
        </NoticeCard>
      )}

      {succes && (
        <NoticeCard className="mb-6 border-ocre-dark/50 bg-ocre/5">
          <p className="text-sm text-ocre-dark">{succes}</p>
        </NoticeCard>
      )}

      <NoticeCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl font-semibold">
              {invitation.groupe?.nom ?? t("groupFallback")}
            </p>
            {invitation.groupe?.description && (
              <p className="mt-2 text-sm text-ink-soft">
                {invitation.groupe.description}
              </p>
            )}
          </div>
          <Tag tone={tonStatut}>{statutInvitationGroupe(invitation.statut)}</Tag>
        </div>

        <p className="mt-4 text-xs text-ink-soft/70">
          {t("receivedOn", { date: formatDate(invitation.dateCreation) })}
        </p>

        <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft/70">{t("sentBy")}</p>
            <div className="mt-2 flex items-center gap-2">
              <Avatar
                nom={inviteur?.utilisateur?.nom ?? t("studentFallback")}
                photoUrl={inviteur?.utilisateur?.photoUrl}
                size={32}
              />
              <span className="font-medium">{inviteur?.utilisateur?.nom ?? t("studentFallback")}</span>
            </div>
          </div>
          <div className="space-y-1 text-ink-soft">
            <p>{t("members", { count: groupe?.membres?.length ?? "—" })}</p>
            <p>{t("mission", { titre: groupe?.mission?.titre ?? t("noMission") })}</p>
          </div>
        </div>

        {estEnAttente && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="flex items-center gap-2"
              onClick={() => void traiter("accepter")}
              disabled={traitement !== null}
            >
              {traitement === "accepter" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}
              {t("accept")}
            </Button>
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={() => void traiter("refuser")}
              disabled={traitement !== null}
            >
              {traitement === "refuser" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <X size={15} />
              )}
              {t("refuse")}
            </Button>
          </div>
        )}

        {!estEnAttente && (
          <Button
            variant="secondary"
            size="sm"
            href="/tableau-de-bord/groupes"
            className="mt-6"
          >
            {t("viewGroups")}
          </Button>
        )}
      </NoticeCard>
    </div>
  );
}
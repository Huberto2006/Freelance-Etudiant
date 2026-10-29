"use client";

import {
  Briefcase,
  ExternalLink,
  FileText,
  Star,
  User,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useChatHelpers } from "@/features/messagerie/hooks/use-chat-helpers";
import { getFileUrl } from "@/lib/api";

import type {
  MessageAvecUtilisateurs,
} from "@/features/messagerie/types";

import type { Mission } from "@/types/missions";
import type { ClientProfile, EtudiantProfile } from "@/types/utilisateurs";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

import {
  PieceJointeAffichage,
} from "@/components/shared/PieceJointe";
import { SelectionConversation, PieceJointeConversation } from "@/features/messagerie/conversation.types";

/* =========================================================
   PANNEAU DETAILS
   ========================================================= */

export function PanneauDetailsConversation({
  conversation,
  autreUtilisateur,
  profilEtudiant,
  profilClient,
  profilHref,
  missionAffichee,
  piecesJointes,
}: {
  conversation: SelectionConversation;

  autreUtilisateur: NonNullable<
    MessageAvecUtilisateurs["expediteur"]
  > | null;

  profilEtudiant:
    | EtudiantProfile
    | null;

  profilClient:
    | ClientProfile
    | null;

  profilHref: string | null;

  missionAffichee:
    | Mission
    | null;

  piecesJointes:
    PieceJointeConversation[];
}) {
  const t = useTranslations("chat");
  const { argent: formatArgent, date: formatDate } = useFormats();
  const { statutMission: libelleStatutMission } = useLabels();
  const { formaterDateListe, afficherRole } = useChatHelpers();
  const noteEtudiant =
    profilEtudiant?.noteMoyenne !=
    null
      ? Number(
          profilEtudiant.noteMoyenne,
        )
      : null;

  /* =========================================================
     GROUPE
     ========================================================= */

  if (
    conversation.type ===
    "GROUPE"
  ) {
    return (
      <>
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">
            <Users
              size={13}
              aria-hidden="true"
            />
            {t("group")}
          </h3>

          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Users
                size={22}
              />
            </span>

            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-ink">
                {
                  conversation.nom
                }
              </p>

              <p className="text-xs text-ink-soft">
                {conversation.nombreMembres !=
                null
                  ? t("membersCount", { count: conversation.nombreMembres })
                  : t("kianjaGroup")}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-soft/80">
            {t("groupMembersOnly")}
          </p>
        </section>

        {piecesJointes.length >
          0 && (
          <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">
              <FileText
                size={13}
              />
              {t("attachments", { count: piecesJointes.length })}
            </h3>

            <ul className="space-y-2">
              {piecesJointes.map(
                (piece) => (
                  <li
                    key={
                      piece.url
                    }
                    className="rounded-lg border border-ink/10 bg-paper p-2.5"
                  >
                    <PieceJointeAffichage
                      url={
                        piece.url
                      }
                      nom={
                        piece.nom
                      }
                    />

                    <p className="mt-1.5 text-[0.65rem] font-mono text-ink-soft/60">
                      {
                        piece.auteur
                      }{" "}
                      ·{" "}
                      {formaterDateListe(
                        piece.dateEnvoi,
                      )}
                    </p>
                  </li>
                ),
              )}
            </ul>
          </section>
        )}
      </>
    );
  }

  /* =========================================================
     INDIVIDUEL
     ========================================================= */

  return (
    <>
      {missionAffichee && (
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">
            <Briefcase
              size={13}
            />
            {t("linkedMission")}
          </h3>

          {missionAffichee.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                getFileUrl(
                  missionAffichee.imageUrl,
                ) ?? ""
              }
              alt=""
              className="mb-3 h-28 w-full rounded-lg border border-ink/10 object-cover"
            />
          )}

          <p className="font-display text-sm font-semibold leading-snug text-ink">
            {
              missionAffichee.titre
            }
          </p>

          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">
                {t("status")}
              </dt>

              <dd className="font-medium text-ink">
                {libelleStatutMission(
                  missionAffichee.statut,
                )}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">
                {t("budget")}
              </dt>

              <dd className="font-medium text-ink">
                {formatArgent(
                  missionAffichee.budget,
                )}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-soft/70">
                {t("deadline")}
              </dt>

              <dd className="font-medium text-ink">
                {formatDate(
                  missionAffichee.dateLimite,
                )}
              </dd>
            </div>
          </dl>

          <Button
            href={`/missions/${missionAffichee.id}`}
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center gap-1.5"
          >
            {t("viewMission")}
                      <ExternalLink
              size={13}
            />
          </Button>
        </section>
      )}

      <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">
          <User
            size={13}
          />
          {t("correspondent")}
        </h3>

        <div className="flex items-center gap-3">
          <Avatar
            nom={
              conversation.nom
            }
            photoUrl={
              autreUtilisateur?.photoUrl
            }
            size={48}
          />

          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">
              {
                conversation.nom
              }
            </p>

            <p className="text-xs text-ink-soft">
              {autreUtilisateur
                ? afficherRole(
                    autreUtilisateur.role,
                  )
                : t("kianjaUser")}
            </p>

            {noteEtudiant !=
              null &&
              !Number.isNaN(
                noteEtudiant,
              ) && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-soft">
                  <Star
                    size={12}
                    className="text-ocre"
                  />

                  {noteEtudiant.toFixed(
                    1,
                  )}
                  /5
                </p>
              )}
          </div>
        </div>

        {profilEtudiant?.universite && (
          <p className="mt-2.5 text-xs text-ink-soft/80">
            Université:&nbsp;
            {
              profilEtudiant.universite
            }
          </p>
        )}

        {profilClient?.nomEntreprise && (
          <p className="mt-2.5 text-xs text-ink-soft/80">
            Entreprise:&nbsp;
            {
              profilClient.nomEntreprise
            }
          </p>
        )}

        {profilHref && (
          <Button
            href={
              profilHref
            }
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-center gap-1.5"
          >
            {t("viewProfile")}
            <ExternalLink
              size={13}
            />
          </Button>
        )}
      </section>

      {piecesJointes.length >
        0 && (
        <section className="rounded-xl border border-ink/10 bg-paper-light p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">
            <FileText
              size={13}
            />
            {t("attachments", { count: piecesJointes.length })}
          </h3>

          <ul className="space-y-2">
            {piecesJointes.map(
              (piece) => (
                <li
                  key={
                    piece.url
                  }
                  className="rounded-lg border border-ink/10 bg-paper p-2.5"
                >
                  <PieceJointeAffichage
                    url={
                      piece.url
                    }
                    nom={
                      piece.nom
                    }
                  />

                  <p className="mt-1.5 text-[0.65rem] font-mono text-ink-soft/60">
                    {
                      piece.auteur
                    }{" "}
                    ·{" "}
                    {formaterDateListe(
                      piece.dateEnvoi,
                    )}
                  </p>
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </>
  );
}

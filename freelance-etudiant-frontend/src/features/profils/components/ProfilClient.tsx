"use client";

import { useState } from "react";
import {
  User,
  Building2,
  BriefcaseBusiness,
  CircleCheck,
  Pencil,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { PhotoProfil } from "@/features/profils/components/PhotoProfil";
import type { ClientProfile, Utilisateur } from "@/types/utilisateurs";
import { InfoItem } from "@/features/profils/components/InfoItem";

/* =========================================================
   PROFIL CLIENT
========================================================= */

export function ProfilClient({ utilisateur }: { utilisateur: Utilisateur }) {
  const { rafraichirProfil } = useAuth();
  const t = useTranslations("profilePage");

  const profil = utilisateur.profilClient;

  const [gestion, setGestion] = useState(false);

  const [nomEntreprise, setNomEntreprise] = useState(
    profil?.nomEntreprise ?? "",
  );

  const [typeClient, setTypeClient] = useState<"particulier" | "entreprise">(
    profil?.typeClient ?? "particulier",
  );

  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErreur(null);
    setMessage(null);
    setEnvoi(true);

    try {
      await api.patch<ClientProfile>("/clients/me", {
        typeClient,
        nomEntreprise: typeClient === "entreprise" ? nomEntreprise : undefined,
      });

      await rafraichirProfil();

      setMessage(t("profileUpdated"));

      setGestion(false);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : t("errUnexpected"),
      );
    } finally {
      setEnvoi(false);
    }
  }

  function annulerModification() {
    setTypeClient(profil?.typeClient ?? "particulier");

    setNomEntreprise(profil?.nomEntreprise ?? "");

    setErreur(null);
    setMessage(null);
    setGestion(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={User} eyebrow={t("yourAccount")} title={t("myProfile")} />

      {/* Identité */}

      <NoticeCard>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <PhotoProfil utilisateur={utilisateur} size={96} />

            <div>
              <p className="font-display text-2xl font-semibold">
                {utilisateur.nom}
              </p>

              <p className="mt-1 text-sm text-ink-soft">{utilisateur.email}</p>

              <div className="mt-3">
                <Tag tone="ocre">{t("roleClient")}</Tag>
              </div>
            </div>
          </div>

          {!gestion && (
            <Button
              variant="primary"
              onClick={() => {
                setMessage(null);
                setErreur(null);
                setGestion(true);
              }}
            >
              <Pencil size={16} />
              {t("manageProfile")}
            </Button>
          )}
        </div>
      </NoticeCard>

      {/* Message */}

      {message && (
        <NoticeCard>
          <div className="flex items-center gap-3 text-rice">
            <CircleCheck size={18} />

            <p className="text-sm">{message}</p>
          </div>
        </NoticeCard>
      )}

      {/* Consultation */}

      {!gestion && (
        <NoticeCard>
          <div className="mb-6 flex items-center gap-3">
            <Building2 size={20} className="text-ocre-dark" />

            <h2 className="font-display text-xl font-semibold">
              {t("accountInfo")}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <InfoItem
              icon={Building2}
              label={t("accountType")}
              value={
                profil?.typeClient === "entreprise"
                  ? t("company")
                  : t("individual")
              }
            />

            {profil?.typeClient === "entreprise" && (
              <InfoItem
                icon={BriefcaseBusiness}
                label={t("companyName")}
                value={profil.nomEntreprise || t("notProvided")}
              />
            )}
          </div>
        </NoticeCard>
      )}

      {/* Formulaire */}

      {gestion && (
        <NoticeCard>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
                {t("management")}
              </p>

              <h2 className="mt-1 font-display text-2xl font-semibold">
                {t("editMyProfile")}
              </h2>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={annulerModification}
              title={t("cancel")}
              aria-label={t("cancel")}
            >
              <X size={18} />
            </Button>
          </div>

          <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-5">
            <Field label={t("accountType")} htmlFor="typeClient">
              <Select
                id="typeClient"
                value={typeClient}
                onChange={(e) =>
                  setTypeClient(e.target.value as "particulier" | "entreprise")
                }
              >
                <option value="particulier">{t("individual")}</option>

                <option value="entreprise">{t("company")}</option>
              </Select>
            </Field>

            {typeClient === "entreprise" && (
              <Field label={t("companyName")} htmlFor="nomEntreprise">
                <Input
                  id="nomEntreprise"
                  value={nomEntreprise}
                  onChange={(e) => setNomEntreprise(e.target.value)}
                  placeholder="CISCO Fianarantsoa"
                />
              </Field>
            )}

            {erreur && <p className="text-sm text-brique">{erreur}</p>}

            {message && <p className="text-sm text-rice">{message}</p>}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={envoi}>
                {envoi ? t("saving") : t("saveChanges")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={annulerModification}
                disabled={envoi}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        </NoticeCard>
      )}
    </div>
  );
}

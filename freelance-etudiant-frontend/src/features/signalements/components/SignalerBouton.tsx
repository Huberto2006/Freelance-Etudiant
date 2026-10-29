"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { CibleSignalement } from "@/types/signalements";

/**
 * Bouton discret ouvrant un formulaire de signalement pour un utilisateur,
 * une mission ou un service. Utilisable sur n'importe quelle fiche publique.
 */
export function SignalerBouton({
  cibleType,
  cibleId,
}: {
  cibleType: CibleSignalement;
  cibleId: string;
}) {
  const t = useTranslations("comments.report");
  const { utilisateur } = useAuth();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  if (!utilisateur) return null;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      await api.post("/signalements", { motif, description, cibleType, cibleId });
      setEnvoye(true);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : t("error"));
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-1.5 text-xs text-ink-soft/60 hover:text-brique transition-colors"
      >
        <Flag size={13} />
        {t("button")}
      </button>
    );
  }

  return (
    <div className="notice-card p-5 max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg font-medium">{t("title")}</p>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label={t("close")}
          className="text-ink-soft hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      {envoye ? (
        <p className="text-sm text-ink-soft">
          {t("success")}
        </p>
      ) : (
        <form onSubmit={envoyer} className="flex flex-col gap-4">
          <Field label={t("reasonLabel")} htmlFor="motif">
            <Input
              id="motif"
              required
              maxLength={100}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={t("reasonPlaceholder")}
            />
          </Field>
          <Field label={t("descriptionLabel")} htmlFor="description">
            <Textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </Field>
          {erreur && <p className="text-sm text-brique">{erreur}</p>}
          <Button type="submit" disabled={envoi} className="self-start">
            {envoi ? t("sending") : t("submit")}
          </Button>
        </form>
      )}
    </div>
  );
}

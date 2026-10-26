"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { BoutonGoogle } from "@/components/auth/BoutonGoogle";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";

/**
 * Liaison EXPLICITE d'un compte Google : l'utilisateur est deja connecte a
 * son compte Kianja (session valide) et prouve en plus la possession du
 * compte Google. Le backend exige que l'email Google soit identique a celui
 * du compte et refuse toute liaison automatique par simple correspondance.
 */
export default function CompteGooglePage() {
  const { utilisateur, rafraichirProfil } = useAuth();
  const t = useTranslations("settings");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const lie = Boolean(utilisateur?.googleId);

  async function lier(idToken: string) {
    if (envoi) return;
    setEnvoi(true);
    setErreur(null);
    setMessage(null);
    try {
      const res = await api.post<{ message: string }>("/auth/google/link", {
        idToken,
      });
      setMessage(res.message);
      await rafraichirProfil();
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : t("google.linkError"),
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        icon={Link2}
        eyebrow={t("google.eyebrow")}
        title={t("google.title")}
        className="mb-6"
      />

      <NoticeCard>
        {lie ? (
          <p className="text-sm text-ink-soft">
            {t("google.linked")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              {t("google.sameEmail", { email: utilisateur?.email ?? "" })}
            </p>
            <BoutonGoogle
              onCredential={lier}
              texte="continue_with"
              disabled={envoi}
            />
          </div>
        )}

        {message && (
          <p role="status" className="mt-4 text-sm text-ink-soft">
            {message}
          </p>
        )}
        {erreur && (
          <p role="alert" className="mt-4 text-sm text-brique">
            {erreur}
          </p>
        )}
      </NoticeCard>
    </div>
  );
}

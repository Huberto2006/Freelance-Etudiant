"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, PasswordInput } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";

function FormulaireReinitialisation() {
  const t = useTranslations("auth.reset");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (nouveauMotDePasse !== confirmation) {
      setErreur(t("errMismatch"));
      return;
    }
    if (!token) {
      setErreur(t("errInvalidLink"));
      return;
    }

    setEnvoi(true);
    try {
      await api.post(
        "/auth/reset-password",
        { token, nouveauMotDePasse },
        { auth: false },
      );
      setSucces(true);
      setTimeout(() => router.push("/connexion"), 2500);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("errGeneric"),
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      {succes ? (
        <p className="text-sm text-ink-soft">
          {t("success")}
        </p>
      ) : !token ? (
        <p className="text-sm text-brique">
          {t("invalidLink")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label={t("newPassword")} htmlFor="nouveauMotDePasse">
            <PasswordInput
              id="nouveauMotDePasse"
              required
              minLength={8}
              autoComplete="new-password"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Field label={t("confirmPassword")} htmlFor="confirmation">
            <PasswordInput
              id="confirmation"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {erreur && <p className="text-sm text-brique">{erreur}</p>}

          <Button type="submit" disabled={envoi} className="mt-2">
            {envoi ? t("resetting") : t("submit")}
          </Button>
        </form>
      )}
    </NoticeCard>
  );
}

export default function ReinitialiserMotDePassePage() {
  const t = useTranslations("auth.reset");
  return (
    <div className="mx-auto max-w-md px-5 pb-12">
      <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ocre-dark">
        {t("eyebrow")}
      </p>
      <h1 className="mb-7 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>

      <Suspense fallback={<p className="text-sm text-ink-soft">{t("loading")}</p>}>
        <FormulaireReinitialisation />
      </Suspense>

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link
          href="/connexion"
          className="font-medium text-ocre-dark hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}

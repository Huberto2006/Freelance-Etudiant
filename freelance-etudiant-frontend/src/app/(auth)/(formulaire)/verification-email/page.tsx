"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";

/**
 * Etats geres par la page. La validation definitive du jeton est TOUJOURS
 * faite par le backend (POST /auth/verify-email) : cette page ne fait
 * qu'afficher le resultat renvoye par l'API.
 */
type EtatVerification =
  | { etat: "en_cours" }
  | { etat: "succes"; message: string }
  | { etat: "erreur"; message: string };

function ContenuVerificationEmail() {
  const t = useTranslations("auth.verify");
  const params = useSearchParams();
  const token = params.get("token");

  const [etat, setEtat] = useState<EtatVerification>(() =>
    token
      ? { etat: "en_cours" }
      : {
          etat: "erreur",
          message:
            t("errNoToken"),
        },
  );

  /*
   * Protege contre la double invocation de l'effet (React StrictMode en
   * dev) : la verification n'est envoyee qu'une seule fois au backend.
   */
  const verificationLancee = useRef(false);

  useEffect(() => {
    if (!token || verificationLancee.current) return;
    verificationLancee.current = true;

    api
      .post<{ message: string }>(
        "/auth/verify-email",
        { token },
        { auth: false },
      )
      .then((reponse) => setEtat({ etat: "succes", message: reponse.message }))
      .catch((err) =>
        setEtat({
          etat: "erreur",
          message:
            err instanceof ApiError
              ? err.message
              : t("errGeneric"),
        }),
      );
  }, [token, t]);

  return (
    <NoticeCard>
      {etat.etat === "en_cours" && (
        <p className="text-sm text-ink-soft">{t("inProgress")}</p>
      )}

      {etat.etat === "succes" && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-soft">{etat.message}</p>
          <Link href="/connexion">
            <Button>{t("login")}</Button>
          </Link>
        </div>
      )}

      {etat.etat === "erreur" && (
        <div className="flex flex-col gap-4">
          {/*
            Message renvoye par le backend : couvre le jeton invalide,
            expire ou deja utilise (l'API distingue les cas).
          */}
          <p className="text-sm text-brique">{etat.message}</p>
          <p className="text-xs text-ink-soft">
            {t("errorHelp")}
          </p>
          <Link
            href="/connexion"
            className="text-sm text-ocre-dark hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </div>
      )}
    </NoticeCard>
  );
}

export default function VerificationEmailPage() {
  const t = useTranslations("auth.verify");
  return (
    <div className="mx-auto max-w-md px-5 pb-12">
      <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ocre-dark">
        {t("eyebrow")}
      </p>
      <h1 className="mb-7 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>

      <Suspense fallback={<p className="text-sm text-ink-soft">Chargement…</p>}>
        <ContenuVerificationEmail />
      </Suspense>

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link href="/" className="font-medium text-ocre-dark hover:underline">
          {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
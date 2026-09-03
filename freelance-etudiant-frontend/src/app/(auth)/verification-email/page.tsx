"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const params = useSearchParams();
  const token = params.get("token");

  const [etat, setEtat] = useState<EtatVerification>(() =>
    token
      ? { etat: "en_cours" }
      : {
          etat: "erreur",
          message:
            "Lien de vérification invalide : aucun jeton n'est présent dans l'adresse.",
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
              : "Une erreur est survenue lors de la vérification de votre adresse email.",
        }),
      );
  }, [token]);

  return (
    <NoticeCard>
      {etat.etat === "en_cours" && (
        <p className="text-sm text-ink-soft">Vérification en cours…</p>
      )}

      {etat.etat === "succes" && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-soft">{etat.message}</p>
          <Link href="/connexion">
            <Button>Se connecter</Button>
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
            Les liens de vérification expirent après 24 heures et ne peuvent
            être utilisés qu&apos;une seule fois. Si votre adresse n&apos;est
            toujours pas vérifiée, tentez de vous connecter : vous pourrez y
            demander un nouvel email.
          </p>
          <Link
            href="/connexion"
            className="text-sm text-ocre-dark hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      )}
    </NoticeCard>
  );
}

export default function VerificationEmailPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
        Vérification de compte
      </p>
      <h1 className="font-display text-3xl font-semibold mb-8">
        Vérification de l&apos;email
      </h1>

      <Suspense fallback={<p className="text-sm text-ink-soft">Chargement…</p>}>
        <ContenuVerificationEmail />
      </Suspense>

      <p className="mt-6 text-sm text-ink-soft text-center">
        <Link href="/" className="text-ocre-dark hover:underline">
          Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
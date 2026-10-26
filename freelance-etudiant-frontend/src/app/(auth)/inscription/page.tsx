"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { ReponseInscription } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/auth/TurnstileWidget";
import { BoutonGoogle } from "@/components/auth/BoutonGoogle";

/**
 * Delai anti-abus applique cote backend : on aligne le compte a rebours
 * du bouton "Renvoyer l'email" sur ce delai.
 */
const DELAI_RENVOI_SECONDES = 60;

function FormulaireInscription() {
  const t = useTranslations("auth.signup");
  const { inscrire, connecterAvecGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const roleInitial = params.get("role") === "client" ? "client" : "etudiant";

  const [role, setRole] = useState<"etudiant" | "client">(roleInitial);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [universite, setUniversite] = useState("EMIT Fianarantsoa");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Jeton Turnstile (a usage unique) et garde contre les doubles envois.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const enCours = useRef(false);

  /*
   * Verification d'email : apres une inscription reussie, le compte n'est
   * PAS utilisable directement. On affiche un ecran dedie indiquant qu'un
   * email de verification a ete envoye, avec l'adresse concernee et un
   * bouton "Renvoyer l'email".
   */
  const [reponseInscription, setReponseInscription] =
    useState<ReponseInscription | null>(null);
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);
  const [renvoiFeedback, setRenvoiFeedback] = useState<{
    type: "succes" | "erreur";
    message: string;
  } | null>(null);
  const [secondesAvantRenvoi, setSecondesAvantRenvoi] = useState(0);

  useEffect(() => {
    if (secondesAvantRenvoi <= 0) return;

    const minuteur = setInterval(() => {
      setSecondesAvantRenvoi((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(minuteur);
  }, [secondesAvantRenvoi]);

  /*
   * Inscription via Google : le compte est cree par le backend a partir du
   * jeton d'identite verifie. Le choix etudiant/client se fait ensuite sur
   * /choix-role (valide cote serveur) ; le bouton ci-dessus ne fait que
   * le pre-selectionner.
   */
  async function onGoogle(idToken: string) {
    if (enCours.current) return;
    if (!turnstileToken) {
      setErreur(t("errCaptchaFirst"));
      return;
    }
    enCours.current = true;
    setErreur(null);
    setEnvoi(true);
    try {
      const { role: roleCompte, completionProfil, premiereConnexion } =
        await connecterAvecGoogle(idToken, turnstileToken);
      router.push(
        roleCompte === "a_definir"
          ? `/choix-role?role=${role}`
          : premiereConnexion &&
              completionProfil?.role === "etudiant" &&
              !completionProfil.complete
            ? "/completer-profil"
            : "/tableau-de-bord",
      );
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : t("errGoogle"),
      );
    } finally {
      enCours.current = false;
      setEnvoi(false);
      turnstile.current?.reset();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enCours.current || !turnstileToken) return;
    enCours.current = true;
    setErreur(null);
    setEnvoi(true);
    try {
      const reponse = await inscrire(
        {
          nom,
          email,
          motDePasse,
          role,
          universite: role === "etudiant" ? universite : undefined,
          nomEntreprise:
            role === "client" ? nomEntreprise || undefined : undefined,
          typeClient:
            role === "client"
              ? nomEntreprise
                ? "entreprise"
                : "particulier"
              : undefined,
        },
        turnstileToken,
      );
      // Pas de redirection vers le tableau de bord : le compte doit
      // d'abord etre active via le lien recu par email.
      setReponseInscription(reponse);
      setSecondesAvantRenvoi(DELAI_RENVOI_SECONDES);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : t("errCreate"),
      );
    } finally {
      enCours.current = false;
      setEnvoi(false);
      turnstile.current?.reset();
    }
  }

  async function renvoyerEmail() {
    if (!reponseInscription) return;
    setRenvoiEnCours(true);
    setRenvoiFeedback(null);
    try {
      const reponse = await api.post<{ message: string }>(
        "/auth/resend-verification",
        { email: reponseInscription.email },
        { auth: false },
      );
      setRenvoiFeedback({ type: "succes", message: reponse.message });
      setSecondesAvantRenvoi(DELAI_RENVOI_SECONDES);
    } catch (err) {
      setRenvoiFeedback({
        type: "erreur",
        message:
          err instanceof ApiError
            ? err.message
            : t("errResend"),
      });
    } finally {
      setRenvoiEnCours(false);
    }
  }

  if (reponseInscription) {
    return (
      <div className="mx-auto max-w-md px-5 pb-12">
        <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ocre-dark">
          {t("verifyEyebrow")}
        </p>
        <h1 className="mb-7 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("verifyTitle")}
        </h1>

        <NoticeCard>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              {t.rich("verifySent", {
                email: reponseInscription.email,
                b: (morceaux) => <strong className="text-ink">{morceaux}</strong>,
              })}
            </p>
            <p className="text-sm text-ink-soft">
              {t("verifyHelp")}
            </p>

            {renvoiFeedback && (
              <p
                className={
                  renvoiFeedback.type === "erreur"
                    ? "text-sm text-brique"
                    : "text-sm text-ink-soft"
                }
              >
                {renvoiFeedback.message}
              </p>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={renvoyerEmail}
              disabled={renvoiEnCours || secondesAvantRenvoi > 0}
            >
              {renvoiEnCours
                ? t("sending")
                : secondesAvantRenvoi > 0
                  ? t("resendIn", { secondes: secondesAvantRenvoi })
                  : t("resend")}
            </Button>
          </div>
        </NoticeCard>

        <p className="mt-6 text-center text-sm text-ink-soft">
          {t("alreadyVerified")}{" "}
          <Link
            href="/connexion"
            className="font-medium text-ocre-dark hover:underline"
          >
            {t("login")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-12">
      <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ocre-dark">
        {t("eyebrow")}
      </p>
      <h1 className="mb-7 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>

      <div
        role="group"
        aria-label={t("accountType")}
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-ink/10 bg-ink/5 p-1"
      >
        <button
          type="button"
          aria-pressed={role === "etudiant"}
          onClick={() => setRole("etudiant")}
          className={clsx(
            "min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu",
            role === "etudiant"
              ? "bg-paper-light text-ink shadow-sm"
              : "text-ink-soft hover:text-ink",
          )}
        >
          {t("imStudent")}
        </button>
        <button
          type="button"
          aria-pressed={role === "client"}
          onClick={() => setRole("client")}
          className={clsx(
            "min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu",
            role === "client"
              ? "bg-paper-light text-ink shadow-sm"
              : "text-ink-soft hover:text-ink",
          )}
        >
          {t("imClient")}
        </button>
      </div>

      <NoticeCard>
        <div className="mb-5 flex flex-col gap-4">
          <BoutonGoogle
            onCredential={onGoogle}
            texte="signup_with"
            disabled={envoi}
          />
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <div className="flex items-center gap-3 text-xs text-ink-soft">
              <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
              {t("orEmail")}
              <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label={t("fullName")} htmlFor="nom">
            <Input
              id="nom"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Lanja Rakoto"
            />
          </Field>
          <Field label={t("email")} htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
            />
          </Field>
          <Field
            label={t("password")}
            htmlFor="motDePasse"
            hint={t("passwordHint")}
          >
            <PasswordInput
              id="motDePasse"
              required
              minLength={8}
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {role === "etudiant" ? (
            <Field label={t("school")} htmlFor="universite">
              <Input
                id="universite"
                value={universite}
                onChange={(e) => setUniversite(e.target.value)}
                placeholder="EMIT Fianarantsoa"
              />
            </Field>
          ) : (
            <Field
              label={t("company")}
              htmlFor="nomEntreprise"
              hint={t("companyHint")}
            >
              <Input
                id="nomEntreprise"
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                placeholder="CISCO Fianarantsoa"
              />
            </Field>
          )}

          {erreur && <p className="text-sm text-brique">{erreur}</p>}

          <TurnstileWidget
            ref={turnstile}
            action="inscription"
            onToken={setTurnstileToken}
          />

          <Button
            type="submit"
            disabled={envoi || !turnstileToken}
            className="mt-2"
          >
            {envoi ? t("creating") : t("submit")}
          </Button>
        </form>
      </NoticeCard>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {t("haveAccount")}{" "}
        <Link
          href="/connexion"
          className="font-medium text-ocre-dark hover:underline"
        >
          {t("login")}
          </Link>
      </p>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <FormulaireInscription />
    </Suspense>
  );
}

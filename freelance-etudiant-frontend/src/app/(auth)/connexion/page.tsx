"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/shared/TurnstileWidget";
import { BoutonGoogle } from "@/features/auth/components/BoutonGoogle";
import { PanneauPresentation } from "@/features/auth/components/PanneauPresentation";

export default function ConnexionPage() {
  const t = useTranslations("auth.login");
  const { connecter, connecterAvecGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Jeton Turnstile (a usage unique) et garde contre les doubles envois.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const enCours = useRef(false);

  /*
   * Cas specifique "email non verifie" : le backend refuse la connexion
   * (401) avec un message clair. On affiche ce message et on propose de
   * renvoyer l'email de verification avec l'adresse saisie.
   */
  const [erreurVerification, setErreurVerification] = useState<string | null>(
    null,
  );
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);
  const [renvoiMessage, setRenvoiMessage] = useState<string | null>(null);

  async function onGoogle(idToken: string) {
    if (enCours.current) return;
    if (!turnstileToken) {
      setErreur(t("errCaptchaFirst"));
      return;
    }
    enCours.current = true;
    setErreur(null);
    setErreurVerification(null);
    setEnvoi(true);
    try {
      const { role, completionProfil, premiereConnexion } =
        await connecterAvecGoogle(idToken, turnstileToken);
      router.push(
        role === "a_definir"
          ? "/choix-role"
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
      // Le jeton Turnstile est a usage unique : on en demande un nouveau.
      turnstile.current?.reset();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enCours.current || !turnstileToken) return;
    enCours.current = true;
    setErreur(null);
    setErreurVerification(null);
    setRenvoiMessage(null);
    setEnvoi(true);
    try {
      const { completionProfil, premiereConnexion } = await connecter(
        email,
        motDePasse,
        turnstileToken,
      );
      router.push(
        premiereConnexion &&
          completionProfil?.role === "etudiant" &&
          !completionProfil.complete
          ? "/completer-profil"
          : "/tableau-de-bord",
      );
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        /verifi|fanamarinana|voamarina/i.test(err.message)
      ) {
        setErreurVerification(err.message);
      } else {
        setErreur(
          err instanceof ApiError
            ? err.message
            : t("errLogin"),
        );
      }
    } finally {
      enCours.current = false;
      setEnvoi(false);
      turnstile.current?.reset();
    }
  }

  async function renvoyerEmailVerification() {
    setRenvoiEnCours(true);
    setRenvoiMessage(null);
    try {
      const reponse = await api.post<{ message: string }>(
        "/auth/resend-verification",
        { email },
        { auth: false },
      );
      setRenvoiMessage(reponse.message);
    } catch (err) {
      setRenvoiMessage(
        err instanceof ApiError
          ? err.message
          : t("errResend"),
      );
    } finally {
      setRenvoiEnCours(false);
    }
  }

  const googleActif = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  return (
    <div className="-mt-16 grid min-h-dvh lg:grid-cols-2">
      <PanneauPresentation />

      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="scene-in rounded-xl border border-ink/10 bg-paper-light p-6 shadow-xs sm:p-8">
            <Link
              href="/"
              aria-label={t("homeAria")}
              className="mb-6 flex w-fit items-center gap-2.5 rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-kianja.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 shrink-0 rounded-xl border border-ink/10 bg-white p-1 object-contain"
              />
              <span className="text-base font-semibold tracking-tight text-ink">
                Kianja
              </span>
            </Link>

            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {t("welcome")}
            </h1>
            <p className="mt-1.5 mb-7 text-sm text-ink-soft">{t("subtitle")}</p>

            <form onSubmit={onSubmit} className="flex flex-col gap-5">
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

              <Field label={t("password")} htmlFor="motDePasse">
                <PasswordInput
                  id="motDePasse"
                  required
                  autoComplete="current-password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>

              <Link
                href="/mot-de-passe-oublie"
                className="-mt-2 self-end text-xs font-medium text-ocre-dark hover:underline"
              >
                {t("forgot")}
              </Link>

              {erreur && (
                <p role="alert" className="animate-in text-sm text-brique">
                  {erreur}
                </p>
              )}

              {erreurVerification && (
                <div className="flex flex-col gap-3">
                  <p role="alert" className="animate-in text-sm text-brique">
                    {erreurVerification}
                  </p>

                  {renvoiMessage && (
                    <p role="status" className="text-xs text-ink-soft">
                      {renvoiMessage}
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={renvoyerEmailVerification}
                    disabled={renvoiEnCours}
                  >
                    {renvoiEnCours ? t("sending") : t("resend")}
                  </Button>
                </div>
              )}

              {/* Turnstile conditionne le bouton et Google : il reste donc
                  au-dessus des deux actions (fonctionnement inchange). */}
              <TurnstileWidget
                ref={turnstile}
                action="connexion"
                onToken={setTurnstileToken}
              />

              <Button
                type="submit"
                loading={envoi}
                disabled={!turnstileToken}
                className="w-full"
              >
                {envoi ? t("loggingIn") : t("submit")}
              </Button>
            </form>

            {googleActif && (
              <div className="mt-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 text-xs text-ink-soft">
                  <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
                  {t("or")}
                  <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
                </div>
                <BoutonGoogle
                  onCredential={onGoogle}
                  texte="continue_with"
                  disabled={envoi}
                />
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {t("noAccount")}{" "}
            <Link
              href="/inscription"
              className="font-medium text-ocre-dark hover:underline"
            >
              {t("signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

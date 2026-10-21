"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/auth/TurnstileWidget";
import { BoutonGoogle } from "@/components/auth/BoutonGoogle";

export default function ConnexionPage() {
  const { connecter, connecterAvecGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Jeton Turnstile et protection contre les doubles envois.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const enCours = useRef(false);

  // Gestion de la vérification de l'adresse email.
  const [erreurVerification, setErreurVerification] = useState<string | null>(
    null,
  );
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);
  const [renvoiMessage, setRenvoiMessage] = useState<string | null>(null);

  async function onGoogle(idToken: string) {
    if (enCours.current) return;

    if (!turnstileToken) {
      setErreur("Complétez d'abord la vérification anti-robot ci-dessous.");
      return;
    }

    enCours.current = true;
    setErreur(null);
    setErreurVerification(null);
    setRenvoiMessage(null);
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
          : "Impossible de se connecter avec Google",
      );
    } finally {
      enCours.current = false;
      setEnvoi(false);
      turnstile.current?.reset();
      setTurnstileToken(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        /verifi/i.test(err.message)
      ) {
        setErreurVerification(err.message);
      } else {
        setErreur(
          err instanceof ApiError
            ? err.message
            : "Impossible de se connecter",
        );
      }
    } finally {
      enCours.current = false;
      setEnvoi(false);
      turnstile.current?.reset();
      setTurnstileToken(null);
    }
  }

  async function renvoyerEmailVerification() {
    if (renvoiEnCours) return;

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
          : "Impossible de renvoyer l'email",
      );
    } finally {
      setRenvoiEnCours(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-5 pb-12">
      <div className="w-full">
        <h1 className="mb-7 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Se connecter
        </h1>

        <NoticeCard>
          <div className="mb-5 flex flex-col gap-4">
            <BoutonGoogle
              onCredential={onGoogle}
              texte="continue_with"
              disabled={envoi}
            />

            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div className="flex items-center gap-3 text-xs text-ink-soft">
                <span
                  className="h-px flex-1 bg-ink/10"
                  aria-hidden="true"
                />
                ou avec votre email
                <span
                  className="h-px flex-1 bg-ink/10"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <Field label="Adresse email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.mg"
                className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </Field>

            <Field label="Mot de passe" htmlFor="motDePasse">
              <PasswordInput
                id="motDePasse"
                required
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                className="focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </Field>

            <Link
              href="/mot-de-passe-oublie"
              className="-mt-2 self-end text-xs font-medium text-ocre-dark hover:underline"
            >
              Mot de passe oublié ?
            </Link>

            {erreur && (
              <p className="text-sm text-brique" role="alert">
                {erreur}
              </p>
            )}

            {erreurVerification && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-brique" role="alert">
                  {erreurVerification}
                </p>

                {renvoiMessage && (
                  <p className="text-xs text-ink-soft" role="status">
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
                  {renvoiEnCours
                    ? "Envoi en cours…"
                    : "Renvoyer l'email de vérification"}
                </Button>
              </div>
            )}

            <TurnstileWidget
              ref={turnstile}
              action="connexion"
              onToken={setTurnstileToken}
            />

            <Button
              type="submit"
              disabled={envoi || !turnstileToken}
              className="mt-2"
            >
              {envoi ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </NoticeCard>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Pas encore de compte?{" "}
          <Link
            href="/inscription"
            className="font-medium text-ocre-dark hover:underline"
          >
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </main>
  );
}

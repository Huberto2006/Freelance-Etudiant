"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/auth/TurnstileWidget";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const enCours = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enCours.current || !turnstileToken) return;
    enCours.current = true;
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await api.post<{ message: string }>(
        "/auth/forgot-password",
        { email },
        { auth: false, headers: { "X-Turnstile-Token": turnstileToken } },
      );
      setMessage(res.message);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Une erreur est survenue",
      );
    } finally {
      enCours.current = false;
      setEnvoi(false);
      turnstile.current?.reset();
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-16">
      <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ocre-dark">
        Récupération de compte
      </p>
      <h1 className="mb-7 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Mot de passe oublié
      </h1>

      <NoticeCard>
        {message ? (
          <p className="text-sm text-ink-soft">{message}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <p className="text-sm text-ink-soft">
              Indiquez votre adresse email : si un compte lui est associé,
              vous recevrez un lien pour choisir un nouveau mot de passe.
            </p>
            <Field label="Adresse email" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.mg"
              />
            </Field>

            {erreur && <p className="text-sm text-brique">{erreur}</p>}

            <TurnstileWidget
              ref={turnstile}
              action="mot-de-passe-oublie"
              onToken={setTurnstileToken}
            />

            <Button
              type="submit"
              disabled={envoi || !turnstileToken}
              className="mt-2"
            >
              {envoi ? "Envoi…" : "Envoyer le lien"}
            </Button>
          </form>
        )}
      </NoticeCard>

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link
          href="/connexion"
          className="font-medium text-ocre-dark hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

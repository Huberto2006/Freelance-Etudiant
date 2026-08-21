"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";

export default function ConnexionPage() {
  const { connecter } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await connecter(email, motDePasse);
      router.push("/tableau-de-bord");
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible de se connecter",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
        Bon retour
      </p>
      <h1 className="font-display text-3xl font-semibold mb-8">
        Se connecter
      </h1>

      <NoticeCard>
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
            />
          </Field>
          <Field label="Mot de passe" htmlFor="motDePasse">
            <Input
              id="motDePasse"
              type="password"
              required
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <Link
            href="/mot-de-passe-oublie"
            className="-mt-2 self-end text-xs text-ocre-dark hover:underline"
          >
            Mot de passe oublié ?
          </Link>

          {erreur && <p className="text-sm text-brique">{erreur}</p>}

          <Button type="submit" disabled={envoi} className="mt-2">
            {envoi ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </NoticeCard>

      <p className="mt-6 text-sm text-ink-soft text-center">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-ocre-dark hover:underline">
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}

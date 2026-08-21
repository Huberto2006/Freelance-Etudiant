"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";

function FormulaireReinitialisation() {
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
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!token) {
      setErreur("Lien de réinitialisation invalide.");
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
        err instanceof ApiError ? err.message : "Une erreur est survenue",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      {succes ? (
        <p className="text-sm text-ink-soft">
          Mot de passe réinitialisé avec succès. Redirection vers la
          connexion…
        </p>
      ) : !token ? (
        <p className="text-sm text-brique">
          Ce lien de réinitialisation est invalide ou incomplet. Merci de
          refaire une demande depuis la page « mot de passe oublié ».
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label="Nouveau mot de passe" htmlFor="nouveauMotDePasse">
            <Input
              id="nouveauMotDePasse"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Confirmer le mot de passe" htmlFor="confirmation">
            <Input
              id="confirmation"
              type="password"
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
            {envoi ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
          </Button>
        </form>
      )}
    </NoticeCard>
  );
}

export default function ReinitialiserMotDePassePage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
        Récupération de compte
      </p>
      <h1 className="font-display text-3xl font-semibold mb-8">
        Nouveau mot de passe
      </h1>

      <Suspense fallback={<p className="text-sm text-ink-soft">Chargement…</p>}>
        <FormulaireReinitialisation />
      </Suspense>

      <p className="mt-6 text-sm text-ink-soft text-center">
        <Link href="/connexion" className="text-ocre-dark hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

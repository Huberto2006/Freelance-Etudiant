"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";

function FormulaireInscription() {
  const { inscrire } = useAuth();
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await inscrire({
        nom,
        email,
        motDePasse,
        role,
        universite: role === "etudiant" ? universite : undefined,
        nomEntreprise: role === "client" ? nomEntreprise || undefined : undefined,
        typeClient: role === "client" ? (nomEntreprise ? "entreprise" : "particulier") : undefined,
      });
      router.push("/tableau-de-bord");
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible de créer le compte",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
        Bienvenue sur Kianja
      </p>
      <h1 className="font-display text-3xl font-semibold mb-8">
        Créer un compte
      </h1>

      <div className="flex mb-6 rounded-lg border border-ink/30 divide-x divide-ink/30 overflow-hidden">
        <button
          type="button"
          onClick={() => setRole("etudiant")}
          className={clsx(
            "flex-1 py-2.5 text-sm font-medium transition-colors",
            role === "etudiant" ? "bg-ink text-paper-light" : "text-ink-soft hover:bg-ink/5",
          )}
        >
          Je suis étudiant
        </button>
        <button
          type="button"
          onClick={() => setRole("client")}
          className={clsx(
            "flex-1 py-2.5 text-sm font-medium transition-colors",
            role === "client" ? "bg-ink text-paper-light" : "text-ink-soft hover:bg-ink/5",
          )}
        >
          Je suis client
        </button>
      </div>

      <NoticeCard>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field label="Nom complet" htmlFor="nom">
            <Input
              id="nom"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Lanja Rakoto"
            />
          </Field>
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
          <Field
            label="Mot de passe"
            htmlFor="motDePasse"
            hint="8 caractères minimum"
          >
            <Input
              id="motDePasse"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {role === "etudiant" ? (
            <Field label="Établissement" htmlFor="universite">
              <Input
                id="universite"
                value={universite}
                onChange={(e) => setUniversite(e.target.value)}
                placeholder="EMIT Fianarantsoa"
              />
            </Field>
          ) : (
            <Field
              label="Entreprise (optionnel)"
              htmlFor="nomEntreprise"
              hint="Laissez vide si vous êtes un particulier"
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

          <Button type="submit" disabled={envoi} className="mt-2">
            {envoi ? "Création…" : "Créer mon compte"}
          </Button>
        </form>
      </NoticeCard>

      <p className="mt-6 text-sm text-ink-soft text-center">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-ocre-dark hover:underline">
          Se connecter
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

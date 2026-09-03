"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { ReponseInscription } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";

/**
 * Delai anti-abus applique cote backend : on aligne le compte a rebours
 * du bouton "Renvoyer l'email" sur ce delai.
 */
const DELAI_RENVOI_SECONDES = 60;

function FormulaireInscription() {
  const { inscrire } = useAuth();
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const reponse = await inscrire({
        nom,
        email,
        motDePasse,
        role,
        universite: role === "etudiant" ? universite : undefined,
        nomEntreprise: role === "client" ? nomEntreprise || undefined : undefined,
        typeClient: role === "client" ? (nomEntreprise ? "entreprise" : "particulier") : undefined,
      });
      // Pas de redirection vers le tableau de bord : le compte doit
      // d'abord etre active via le lien recu par email.
      setReponseInscription(reponse);
      setSecondesAvantRenvoi(DELAI_RENVOI_SECONDES);
    } catch (err) {
      setErreur(
        err instanceof ApiError ? err.message : "Impossible de créer le compte",
      );
    } finally {
      setEnvoi(false);
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
            : "Impossible de renvoyer l'email",
      });
    } finally {
      setRenvoiEnCours(false);
    }
  }

  if (reponseInscription) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-3">
          Vérification de l&apos;email
        </p>
        <h1 className="font-display text-3xl font-semibold mb-8">
          Confirmez votre adresse email
        </h1>

        <NoticeCard>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Un email de vérification a été envoyé à{" "}
              <strong className="text-ink">{reponseInscription.email}</strong>.
            </p>
            <p className="text-sm text-ink-soft">
              Ouvrez le lien qu&apos;il contient pour activer votre compte.
              Pensez à vérifier votre dossier de courriers indésirables si le
              message n&apos;arrive pas sous quelques minutes.
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
                ? "Envoi en cours…"
                : secondesAvantRenvoi > 0
                  ? `Renvoyer l'email (${secondesAvantRenvoi}s)`
                  : "Renvoyer l'email"}
            </Button>
          </div>
        </NoticeCard>

        <p className="mt-6 text-sm text-ink-soft text-center">
          Vous avez déjà vérifié votre adresse ?{" "}
          <Link href="/connexion" className="text-ocre-dark hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    );
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

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { Briefcase, GraduationCap } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { NoticeCard } from "@/components/ui/Notice";

type RoleChoisi = "etudiant" | "client";

const OPTIONS: {
  valeur: RoleChoisi;
  Icone: typeof GraduationCap;
}[] = [
  {
    valeur: "etudiant",
    
    Icone: GraduationCap,
  },
  {
    valeur: "client",
    
    Icone: Briefcase,
  },
];

function ChoixRole() {
  const t = useTranslations("auth.chooseRole");
  const { utilisateur, chargement, choisirRole } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [choix, setChoix] = useState<RoleChoisi>(
    params.get("role") === "client" ? "client" : "etudiant",
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Evite que la garde ci-dessous ne redirige avant la navigation choisie.
  const redirectionManuelle = useRef(false);

  useEffect(() => {
    if (chargement || redirectionManuelle.current) return;
    if (!utilisateur) {
      router.replace("/connexion");
    } else if (utilisateur.role !== "a_definir") {
      router.replace("/tableau-de-bord");
    }
  }, [chargement, utilisateur, router]);

  async function valider() {
    if (envoi) return;
    setErreur(null);
    setEnvoi(true);
    redirectionManuelle.current = true;
    try {
      const { completionProfil } = await choisirRole(choix);
      router.push(
        completionProfil?.role === "etudiant" && !completionProfil.complete
          ? "/completer-profil"
          : "/tableau-de-bord",
      );
    } catch (err) {
      redirectionManuelle.current = false;
      setErreur(
        err instanceof ApiError
          ? err.message
          : t("errSave"),
      );
      setEnvoi(false);
    }
  }

  if (chargement || !utilisateur || utilisateur.role !== "a_definir") {
    return <p className="text-sm text-ink-soft">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ocre-dark">
        {t("eyebrow")}
      </p>
      <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mb-7 text-sm text-ink-soft">
        {t("intro", { nom: utilisateur.nom })}
      </p>

      <NoticeCard>
        <div
          role="radiogroup"
          aria-label={t("accountType")}
          className="grid gap-3 sm:grid-cols-2"
        >
          {OPTIONS.map(({ valeur, Icone }) => (
            <button
              key={valeur}
              type="button"
              role="radio"
              aria-checked={choix === valeur}
              onClick={() => setChoix(valeur)}
              disabled={envoi}
              className={clsx(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                choix === valeur
                  ? "border-ink bg-ink/5"
                  : "border-ink/15 hover:border-ink/40",
              )}
            >
              <Icone size={20} aria-hidden="true" />
              <span className="text-sm font-semibold text-ink">{t(`${valeur}.title`)}</span>
              <span className="text-xs text-ink-soft">{t(`${valeur}.description`)}</span>
            </button>
          ))}
        </div>

        {erreur && (
          <p role="alert" className="mt-4 text-sm text-brique">
            {erreur}
          </p>
        )}

        <Button
          type="button"
          onClick={valider}
          disabled={envoi}
          className="mt-5 w-full"
        >
          {envoi ? t("saving") : t("continue")}
        </Button>
      </NoticeCard>
    </div>
  );
}

export default function ChoixRolePage() {
  return (
    <Suspense fallback={null}>
      <ChoixRole />
    </Suspense>
  );
}

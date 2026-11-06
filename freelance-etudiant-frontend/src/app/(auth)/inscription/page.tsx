"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness, GraduationCap } from "lucide-react";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { ReponseInscription } from "@/types/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/shared/TurnstileWidget";
import { BoutonGoogle } from "@/features/auth/components/BoutonGoogle";
import { LienRetourSite } from "@/features/auth/components/LienRetourSite";
import { PanneauPresentation } from "@/features/auth/components/PanneauPresentation";

/**
 * Delai anti-abus applique cote backend : on aligne le compte a rebours
 * du bouton "Renvoyer l'email" sur ce delai.
 */
const DELAI_RENVOI_SECONDES = 60;

/**
 * Inscription en série de questions : un seul champ par écran, pour que la
 * page tienne toujours dans la fenêtre, sans défilement.
 */
const ETAPES = [
  "role",
  "nom",
  "email",
  "motdepasse",
  "structure",
  "verification",
] as const;

type Etape = (typeof ETAPES)[number];

const DERNIERE_ETAPE = ETAPES.length - 1;

function FormulaireInscription() {
  const t = useTranslations("auth.signup");
  const { inscrire, connecterAvecGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const roleInitial = params.get("role") === "client" ? "client" : "etudiant";

  const [index, setIndex] = useState(0);
  // Parcours « Google » : on saute directement à la dernière étape, qui ne
  // porte alors que la vérification anti-robot et le bouton Google.
  const [viaGoogle, setViaGoogle] = useState(false);

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
   * PAS utilisable directement. La reponse indique si le serveur SMTP a
   * accepte le message ; cela ne garantit pas sa livraison en boite.
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

  const etape: Etape = ETAPES[index];
  const googleActif = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  function choisirRole(choix: "etudiant" | "client") {
    setRole(choix);
    setErreur(null);
    setIndex(1);
  }

  function versGoogle() {
    setErreur(null);
    setViaGoogle(true);
    setIndex(DERNIERE_ETAPE);
  }

  function precedent() {
    setErreur(null);
    // Le widget Turnstile disparait avec l'etape : son jeton n'est plus valable.
    if (etape === "verification") setTurnstileToken(null);
    if (viaGoogle) {
      setViaGoogle(false);
      setIndex(0);
      return;
    }
    setIndex((i) => Math.max(0, i - 1));
  }

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

  async function creerCompte() {
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

  /*
   * Chaque étape est un <form> : la validation native (champ requis, e-mail
   * valide, 8 caractères minimum) s'applique au champ affiché avant de passer
   * à la suite, et la touche Entrée fait avancer.
   */
  function surSoumission(e: React.FormEvent) {
    e.preventDefault();
    if (etape !== "verification") {
      setErreur(null);
      setIndex((i) => Math.min(DERNIERE_ETAPE, i + 1));
      return;
    }
    if (!viaGoogle) void creerCompte();
  }

  async function renvoyerEmail() {
    if (!reponseInscription) return;
    setRenvoiEnCours(true);
    setRenvoiFeedback(null);
    try {
      await api.post<{ message: string }>(
        "/auth/resend-verification",
        { email: reponseInscription.email },
        { auth: false },
      );
      setRenvoiFeedback({ type: "succes", message: t("resendRequestReceived") });
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

  const questions: Record<Etape, string> = {
    role: t("stepRole"),
    nom: t("stepName"),
    email: t("stepEmail"),
    motdepasse: t("stepPassword"),
    structure: role === "etudiant" ? t("stepSchool") : t("stepCompany"),
    verification: t("stepVerify"),
  };

  const contenu = reponseInscription ? (
    <>
      <div className="scene-in rounded-xl border border-ink/10 bg-paper-light p-6 shadow-xs sm:p-8">
        <p className="mb-2 text-xs font-semibold text-ocre-dark">
          {t("verifyEyebrow")}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("verifyTitle")}
        </h1>

        <div className="mt-5 flex flex-col gap-4">
          {reponseInscription.emailAccepteParSmtp ? (
            <>
              <p className="text-sm text-ink-soft">
                {t.rich("verifyAccepted", {
                  email: reponseInscription.email,
                  b: (morceaux) => (
                    <strong className="text-ink">{morceaux}</strong>
                  ),
                })}
              </p>
              <p className="text-sm text-ink-soft">{t("verifyHelp")}</p>
            </>
          ) : (
            <p className="text-sm text-brique">{t("verifyNotAccepted")}</p>
          )}

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
      </div>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {t("alreadyVerified")}{" "}
        <Link
          href="/connexion"
          className="font-medium text-ocre-dark hover:underline"
        >
          {t("login")}
        </Link>
      </p>
    </>
  ) : (
    <>
      <div className="scene-in rounded-xl border border-ink/10 bg-paper-light p-6 shadow-xs sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className=" text-xs font-semibold text-ocre-dark">
            {t("title")}
          </p>
          {!viaGoogle && (
            <p className="text-xs text-ink-soft">
              {t("stepCounter", {
                courante: index + 1,
                total: ETAPES.length,
              })}
            </p>
          )}
        </div>

        {!viaGoogle && (
          <div
            role="progressbar"
            aria-label={t("progressLabel")}
            aria-valuemin={1}
            aria-valuemax={ETAPES.length}
            aria-valuenow={index + 1}
            className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className="h-full rounded-full bg-bleu-dark transition-[width] duration-300 ease-out"
              style={{ width: `${((index + 1) / ETAPES.length) * 100}%` }}
            />
          </div>
        )}

        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {questions[etape]}
        </h1>

        <form onSubmit={surSoumission} className="mt-6 flex flex-col gap-5">
          <div key={etape} className="animate-in flex flex-col gap-4">
            {etape === "role" && (
              <>
                <div
                  role="group"
                  aria-label={t("accountType")}
                  className="flex flex-col gap-3"
                >
                  {(
                    [
                      {
                        valeur: "etudiant",
                        icone: GraduationCap,
                        titre: t("imStudent"),
                        texte: t("roleStudentHint"),
                      },
                      {
                        valeur: "client",
                        icone: BriefcaseBusiness,
                        titre: t("imClient"),
                        texte: t("roleClientHint"),
                      },
                    ] as const
                  ).map(({ valeur, icone: Icone, titre, texte }) => (
                    <button
                      key={valeur}
                      type="button"
                      aria-pressed={role === valeur}
                      onClick={() => choisirRole(valeur)}
                      className={clsx(
                        "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                        role === valeur
                          ? "border-ink bg-ink/[0.04]"
                          : "border-ink/15 hover:border-ink/40 hover:bg-ink/5",
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink/10 bg-paper-light text-bleu-dark">
                        <Icone size={20} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">
                          {titre}
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {texte}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {googleActif && (
                  <>
                    <span
                      className="h-px w-full bg-ink/10"
                      aria-hidden="true"
                    />
                    <Button type="button" variant="ghost" onClick={versGoogle}>
                      {t("viaGoogle")}
                    </Button>
                  </>
                )}
              </>
            )}

            {etape === "nom" && (
              <Field label={t("fullName")} htmlFor="nom">
                <Input
                  id="nom"
                  required
                  autoFocus
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Lanja Rakoto"
                />
              </Field>
            )}

            {etape === "email" && (
              <Field label={t("email")} htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                />
              </Field>
            )}

            {etape === "motdepasse" && (
              <Field
                label={t("password")}
                htmlFor="motDePasse"
                hint={t("passwordHint")}
              >
                <PasswordInput
                  id="motDePasse"
                  required
                  autoFocus
                  minLength={8}
                  autoComplete="new-password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            )}

            {etape === "structure" &&
              (role === "etudiant" ? (
                <Field label={t("school")} htmlFor="universite">
                  <Input
                    id="universite"
                    autoFocus
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
                    autoFocus
                    value={nomEntreprise}
                    onChange={(e) => setNomEntreprise(e.target.value)}
                    placeholder="CISCO Fianarantsoa"
                  />
                </Field>
              ))}

            {etape === "verification" && (
              <>
                <p className="text-sm text-ink-soft">
                  {viaGoogle ? t("stepVerifyGoogleHint") : t("stepVerifyHint")}
                </p>

                <TurnstileWidget
                  ref={turnstile}
                  action="inscription"
                  onToken={setTurnstileToken}
                />

                {viaGoogle && (
                  <BoutonGoogle
                    onCredential={onGoogle}
                    texte="signup_with"
                    disabled={envoi}
                  />
                )}
              </>
            )}
          </div>

          {erreur && (
            <p role="alert" className="text-sm text-brique">
              {erreur}
            </p>
          )}

          {etape !== "role" && (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={precedent}
                disabled={envoi}
              >
                {t("back")}
              </Button>

              {etape !== "verification" && (
                <Button type="submit" className="flex-1">
                  {t("next")}
                </Button>
              )}

              {etape === "verification" && !viaGoogle && (
                <Button
                  type="submit"
                  loading={envoi}
                  disabled={!turnstileToken}
                  className="flex-1"
                >
                  {envoi ? t("creating") : t("submit")}
                </Button>
              )}
            </div>
          )}
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {t("haveAccount")}{" "}
        <Link
          href="/connexion"
          className="font-medium text-ocre-dark hover:underline"
        >
          {t("login")}
        </Link>
      </p>
    </>
  );

  return (
    // lg:h-dvh + overflow-hidden : sur ordinateur la page ne défile jamais ;
    // seule la colonne du formulaire pourrait défiler, et uniquement sur une
    // fenêtre exceptionnellement basse. -mt-16 : la Navbar est masquée ici.
    <div className="-mt-16 grid min-h-dvh lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      <PanneauPresentation titre={t("panel.title")} intro={t("panel.intro")} />

      <div className="flex min-h-0 flex-col overflow-y-auto px-5 py-6 sm:px-8">
        <LienRetourSite className="-ml-2" />
        <div className="flex flex-1 items-center justify-center py-4">
          <div className="w-full max-w-md">{contenu}</div>
        </div>
      </div>
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

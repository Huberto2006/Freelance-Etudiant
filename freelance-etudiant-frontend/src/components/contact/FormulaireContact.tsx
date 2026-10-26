"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { api, ApiError } from "@/lib/api";
import { Field, Input, Textarea } from "@/components/ui/Field";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/auth/TurnstileWidget";

interface ValeursFormulaire {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}

type ErreursFormulaire = Partial<Record<keyof ValeursFormulaire, string>>;

type Etat =
  | { statut: "repos" }
  | { statut: "envoi" }
  | { statut: "succes" }
  | { statut: "erreur"; message: string };

const VIDE: ValeursFormulaire = { nom: "", email: "", sujet: "", message: "" };

const MOTIF_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function valider(
  valeurs: ValeursFormulaire,
  t: (cle: "errName" | "errNameMax" | "errEmail" | "errEmailInvalid" | "errSubject" | "errSubjectMax" | "errMessageMin" | "errMessageMax") => string,
): ErreursFormulaire {
  const erreurs: ErreursFormulaire = {};
  const nom = valeurs.nom.trim();
  const email = valeurs.email.trim();
  const sujet = valeurs.sujet.trim();
  const message = valeurs.message.trim();

  if (!nom) erreurs.nom = t("errName");
  else if (nom.length > 100) erreurs.nom = t("errNameMax");

  if (!email) erreurs.email = t("errEmail");
  else if (!MOTIF_EMAIL.test(email) || email.length > 150) {
    erreurs.email = t("errEmailInvalid");
  }

  if (!sujet) erreurs.sujet = t("errSubject");
  else if (sujet.length > 150) erreurs.sujet = t("errSubjectMax");

  if (message.length < 10) {
    erreurs.message = t("errMessageMin");
  } else if (message.length > 3000) {
    erreurs.message = t("errMessageMax");
  }

  return erreurs;
}

/**
 * Formulaire de contact : envoie réellement le message au backend
 * (POST /contact). Le succès n'est affiché qu'après une réponse positive
 * du serveur ; si le service de messagerie n'est pas configuré côté
 * serveur, le visiteur en est informé au lieu de croire son message parti.
 */
export function FormulaireContact() {
  const t = useTranslations("contact.form");
  const [valeurs, setValeurs] = useState<ValeursFormulaire>(VIDE);
  const [erreurs, setErreurs] = useState<ErreursFormulaire>({});
  const [piege, setPiege] = useState("");
  const [etat, setEtat] = useState<Etat>({ statut: "repos" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  function modifier(champ: keyof ValeursFormulaire, valeur: string) {
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));
    if (erreurs[champ]) {
      setErreurs((courant) => ({ ...courant, [champ]: undefined }));
    }
  }

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (etat.statut === "envoi" || !turnstileToken) return;

    const erreursTrouvees = valider(valeurs, t);
    setErreurs(erreursTrouvees);
    if (Object.keys(erreursTrouvees).length > 0) {
      // Place le focus sur le premier champ en erreur.
      const premier = (
        ["nom", "email", "sujet", "message"] as const
      ).find((champ) => erreursTrouvees[champ]);
      if (premier) document.getElementById(`contact-${premier}`)?.focus();
      return;
    }

    setEtat({ statut: "envoi" });
    try {
      await api.post(
        "/contact",
        {
          nom: valeurs.nom.trim(),
          email: valeurs.email.trim(),
          sujet: valeurs.sujet.trim(),
          message: valeurs.message.trim(),
          ...(piege ? { siteWeb: piege } : {}),
        },
        { auth: false, headers: { "X-Turnstile-Token": turnstileToken } },
      );
      setEtat({ statut: "succes" });
      setValeurs(VIDE);
    } catch (error) {
      let message = t("errGeneric");
      if (error instanceof ApiError) {
        if (error.status === 429) {
          message =
            t("errRateLimit");
        } else if (error.status === 503) {
          message =
            t("errUnavailable");
        } else if (error.message) {
          message = error.message;
        }
      } else {
        message =
          t("errNetwork");
      }
      setEtat({ statut: "erreur", message });
    } finally {
      // Jeton a usage unique : nouvelle verification pour un prochain envoi.
      turnstile.current?.reset();
    }
  }

  if (etat.statut === "succes") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-ink/10 bg-paper-light p-6 text-center shadow-sm sm:p-8"
      >
        <span
          aria-hidden="true"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rice/10 text-rice"
        >
          <CheckCircle2 size={22} />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold text-ink">
          {t("sentTitle")}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t("sentText")}
        </p>
        <button
          type="button"
          onClick={() => setEtat({ statut: "repos" })}
          className="mt-5 inline-flex items-center justify-center rounded-lg border border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  const enEnvoi = etat.statut === "envoi";

  return (
    <form
      onSubmit={envoyer}
      noValidate
      className="space-y-5 rounded-2xl border border-ink/10 bg-paper-light p-5 shadow-sm sm:p-6"
    >
      {etat.statut === "erreur" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-brique/30 bg-brique/5 px-3.5 py-3 text-sm text-brique"
        >
          <TriangleAlert
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <p>{etat.message}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="contact-nom" error={erreurs.nom}>
          <Input
            id="contact-nom"
            name="nom"
            autoComplete="name"
            value={valeurs.nom}
            onChange={(e) => modifier("nom", e.target.value)}
            maxLength={100}
            aria-invalid={Boolean(erreurs.nom)}
            required
          />
        </Field>

        <Field label={t("email")} htmlFor="contact-email" error={erreurs.email}>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={valeurs.email}
            onChange={(e) => modifier("email", e.target.value)}
            maxLength={150}
            aria-invalid={Boolean(erreurs.email)}
            required
          />
        </Field>
      </div>

      <Field label={t("subject")} htmlFor="contact-sujet" error={erreurs.sujet}>
        <Input
          id="contact-sujet"
          name="sujet"
          value={valeurs.sujet}
          onChange={(e) => modifier("sujet", e.target.value)}
          maxLength={150}
          aria-invalid={Boolean(erreurs.sujet)}
          required
        />
      </Field>

      <Field
        label={t("message")}
        htmlFor="contact-message"
        error={erreurs.message}
        hint={t("counter", { count: valeurs.message.length })}
      >
        <Textarea
          id="contact-message"
          name="message"
          rows={6}
          value={valeurs.message}
          onChange={(e) => modifier("message", e.target.value)}
          maxLength={3000}
          aria-invalid={Boolean(erreurs.message)}
          required
        />
      </Field>

      {/* Champ piège anti-robots : invisible et hors parcours clavier. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="contact-site-web">{t("doNotFill")}</label>
        <input
          id="contact-site-web"
          type="text"
          name="siteWeb"
          tabIndex={-1}
          autoComplete="off"
          value={piege}
          onChange={(e) => setPiege(e.target.value)}
        />
      </div>

      <TurnstileWidget
        ref={turnstile}
        action="contact"
        onToken={setTurnstileToken}
      />

      <button
        type="submit"
        disabled={enEnvoi || !turnstileToken}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {enEnvoi && (
          <Loader2
            size={15}
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        )}
        {enEnvoi ? t("sending") : t("send")}
      </button>
    </form>
  );
}

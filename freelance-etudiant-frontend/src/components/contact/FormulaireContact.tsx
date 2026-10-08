"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { Field, Input, Textarea } from "@/components/ui/Field";

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

function valider(valeurs: ValeursFormulaire): ErreursFormulaire {
  const erreurs: ErreursFormulaire = {};
  const nom = valeurs.nom.trim();
  const email = valeurs.email.trim();
  const sujet = valeurs.sujet.trim();
  const message = valeurs.message.trim();

  if (!nom) erreurs.nom = "Indiquez votre nom.";
  else if (nom.length > 100) erreurs.nom = "100 caractères maximum.";

  if (!email) erreurs.email = "Indiquez votre adresse e-mail.";
  else if (!MOTIF_EMAIL.test(email) || email.length > 150) {
    erreurs.email = "Adresse e-mail invalide.";
  }

  if (!sujet) erreurs.sujet = "Indiquez le sujet de votre message.";
  else if (sujet.length > 150) erreurs.sujet = "150 caractères maximum.";

  if (message.length < 10) {
    erreurs.message = "Le message doit contenir au moins 10 caractères.";
  } else if (message.length > 3000) {
    erreurs.message = "3 000 caractères maximum.";
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
  const [valeurs, setValeurs] = useState<ValeursFormulaire>(VIDE);
  const [erreurs, setErreurs] = useState<ErreursFormulaire>({});
  const [piege, setPiege] = useState("");
  const [etat, setEtat] = useState<Etat>({ statut: "repos" });

  function modifier(champ: keyof ValeursFormulaire, valeur: string) {
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));
    if (erreurs[champ]) {
      setErreurs((courant) => ({ ...courant, [champ]: undefined }));
    }
  }

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (etat.statut === "envoi") return;

    const erreursTrouvees = valider(valeurs);
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
        { auth: false },
      );
      setEtat({ statut: "succes" });
      setValeurs(VIDE);
    } catch (error) {
      let message = "Une erreur est survenue. Veuillez réessayer.";
      if (error instanceof ApiError) {
        if (error.status === 429) {
          message =
            "Trop de messages envoyés en peu de temps. Patientez une minute avant de réessayer.";
        } else if (error.status === 503) {
          message =
            "Le service de contact n'est pas disponible pour le moment. Veuillez réessayer plus tard.";
        } else if (error.message) {
          message = error.message;
        }
      } else {
        message =
          "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.";
      }
      setEtat({ statut: "erreur", message });
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
          Message envoyé
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Merci, nous avons bien reçu votre message.
        </p>
        <button
          type="button"
          onClick={() => setEtat({ statut: "repos" })}
          className="mt-5 inline-flex items-center justify-center rounded-lg border border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
        >
          Envoyer un autre message
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
        <Field label="Nom" htmlFor="contact-nom" error={erreurs.nom}>
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

        <Field label="E-mail" htmlFor="contact-email" error={erreurs.email}>
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

      <Field label="Sujet" htmlFor="contact-sujet" error={erreurs.sujet}>
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
        label="Message"
        htmlFor="contact-message"
        error={erreurs.message}
        hint={`${valeurs.message.length} / 3 000 caractères`}
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
        <label htmlFor="contact-site-web">Ne pas remplir</label>
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

      <button
        type="submit"
        disabled={enEnvoi}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {enEnvoi && (
          <Loader2
            size={15}
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        )}
        {enEnvoi ? "Envoi en cours…" : "Envoyer le message"}
      </button>
    </form>
  );
}

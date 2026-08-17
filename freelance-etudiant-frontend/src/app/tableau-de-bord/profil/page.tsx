"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { NoticeCard } from "@/components/ui/Notice";
import type { ClientProfile, EtudiantProfile, Utilisateur } from "@/lib/types";

export default function ProfilPage() {
  const { utilisateur } = useAuth();

  if (!utilisateur) return null;

  if (utilisateur.role === "etudiant") {
    return <ProfilEtudiantForm utilisateur={utilisateur} />;
  }
  if (utilisateur.role === "client") {
    return <ProfilClientForm utilisateur={utilisateur} />;
  }
  return (
    <p className="text-sm text-ink-soft">
      Les administrateurs n&apos;ont pas de profil public à modifier.
    </p>
  );
}

function ProfilEtudiantForm({ utilisateur }: { utilisateur: Utilisateur }) {
  const { rafraichirProfil } = useAuth();
  const profil = utilisateur.profilEtudiant;

  const [niveauEtude, setNiveauEtude] = useState(profil?.niveauEtude ?? "");
  const [universite, setUniversite] = useState(profil?.universite ?? "");
  const [description, setDescription] = useState(profil?.description ?? "");
  const [competences, setCompetences] = useState(
    profil?.competences.join(", ") ?? "",
  );
  const [langues, setLangues] = useState(profil?.langues.join(", ") ?? "");
  const [tarifHoraire, setTarifHoraire] = useState(
    profil?.tarifHoraire ? String(profil.tarifHoraire) : "",
  );
  const [disponibilite, setDisponibilite] = useState(profil?.disponibilite ?? true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    setEnvoi(true);
    try {
      await api.patch<EtudiantProfile>("/etudiants/me", {
        niveauEtude: niveauEtude || undefined,
        universite: universite || undefined,
        description: description || undefined,
        competences: competences
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        langues: langues
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        tarifHoraire: tarifHoraire ? Number(tarifHoraire) : undefined,
        disponibilite,
      });
      setMessage("Profil mis à jour.");
      await rafraichirProfil();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur inattendue");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-8">Mon profil</h1>
      <NoticeCard>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Niveau d'étude" htmlFor="niveauEtude">
              <Input
                id="niveauEtude"
                value={niveauEtude}
                onChange={(e) => setNiveauEtude(e.target.value)}
                placeholder="Licence 3"
              />
            </Field>
            <Field label="Établissement" htmlFor="universite">
              <Input
                id="universite"
                value={universite}
                onChange={(e) => setUniversite(e.target.value)}
                placeholder="EMIT Fianarantsoa"
              />
            </Field>
          </div>

          <Field label="Présentation" htmlFor="description">
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre parcours et ce que vous proposez…"
            />
          </Field>

          <Field
            label="Compétences"
            htmlFor="competences"
            hint="Séparées par des virgules"
          >
            <Input
              id="competences"
              value={competences}
              onChange={(e) => setCompetences(e.target.value)}
              placeholder="Next.js, NestJS, PostgreSQL"
            />
          </Field>

          <Field label="Langues" htmlFor="langues" hint="Séparées par des virgules">
            <Input
              id="langues"
              value={langues}
              onChange={(e) => setLangues(e.target.value)}
              placeholder="Malagasy, Français, Anglais"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 items-end">
            <Field label="Tarif horaire (Ar)" htmlFor="tarifHoraire">
              <Input
                id="tarifHoraire"
                type="number"
                min={0}
                value={tarifHoraire}
                onChange={(e) => setTarifHoraire(e.target.value)}
                placeholder="15000"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-soft pb-2.5">
              <input
                type="checkbox"
                checked={disponibilite}
                onChange={(e) => setDisponibilite(e.target.checked)}
                className="h-4 w-4 accent-rice"
              />
              Disponible pour de nouvelles missions
            </label>
          </div>

          {erreur && <p className="text-sm text-brique">{erreur}</p>}
          {message && <p className="text-sm text-rice">{message}</p>}

          <Button type="submit" disabled={envoi} className="self-start">
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </NoticeCard>
    </div>
  );
}

function ProfilClientForm({ utilisateur }: { utilisateur: Utilisateur }) {
  const { rafraichirProfil } = useAuth();
  const profil = utilisateur.profilClient;

  const [nomEntreprise, setNomEntreprise] = useState(profil?.nomEntreprise ?? "");
  const [typeClient, setTypeClient] = useState<"particulier" | "entreprise">(
    profil?.typeClient ?? "particulier",
  );
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    setEnvoi(true);
    try {
      await api.patch<ClientProfile>("/clients/me", {
        typeClient,
        nomEntreprise: typeClient === "entreprise" ? nomEntreprise : undefined,
      });
      setMessage("Profil mis à jour.");
      await rafraichirProfil();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur inattendue");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-8">Mon profil</h1>
      <NoticeCard>
        <form onSubmit={onSubmit} className="flex flex-col gap-5 max-w-md">
          <Field label="Type de compte" htmlFor="typeClient">
            <select
              id="typeClient"
              value={typeClient}
              onChange={(e) =>
                setTypeClient(e.target.value as "particulier" | "entreprise")
              }
              className="border border-ink/30 bg-paper-light px-3 py-2.5 text-sm"
            >
              <option value="particulier">Particulier</option>
              <option value="entreprise">Entreprise</option>
            </select>
          </Field>

          {typeClient === "entreprise" && (
            <Field label="Nom de l'entreprise" htmlFor="nomEntreprise">
              <Input
                id="nomEntreprise"
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                placeholder="CISCO Fianarantsoa"
              />
            </Field>
          )}

          {erreur && <p className="text-sm text-brique">{erreur}</p>}
          {message && <p className="text-sm text-rice">{message}</p>}

          <Button type="submit" disabled={envoi} className="self-start">
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </NoticeCard>
    </div>
  );
}

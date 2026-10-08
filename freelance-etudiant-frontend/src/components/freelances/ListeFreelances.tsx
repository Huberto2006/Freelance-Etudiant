"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, MapPin, Search, Star, Users } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { EtudiantProfile } from "@/lib/types";

import { Avatar } from "@/components/ui/Avatar";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";

const TAILLE_PAGE = 24;
const COMPETENCES_AFFICHEES = 5;

const LABELS_DISPONIBILITE: Record<string, string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  en_mission: "En mission",
  indisponible: "Indisponible",
};

const TONS_DISPONIBILITE: Record<
  string,
  "ink" | "ocre" | "rice" | "brique" | "bleu"
> = {
  disponible: "rice",
  occupe: "ocre",
  en_mission: "bleu",
  indisponible: "brique",
};

/**
 * Annuaire des freelances (étudiants).
 *
 * RG-VIS-001 : le backend réserve GET /etudiants aux utilisateurs
 * connectés. Cette page n'essaie donc jamais de contourner la règle : un
 * visiteur voit une invitation à se connecter, un utilisateur connecté
 * voit la liste. Le backend renvoie déjà une projection en liste blanche
 * (nom, photo, formation, compétences, disponibilité, évaluations) ;
 * le champ `telephone` du type partagé n'est jamais lu ni affiché ici.
 */
export function ListeFreelances() {
  const { utilisateur, chargement: chargementSession } = useAuth();

  const [etudiants, setEtudiants] = useState<EtudiantProfile[]>([]);
  const [page, setPage] = useState(1);
  const [peutCharger, setPeutCharger] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [chargementPlus, setChargementPlus] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [recherche, setRecherche] = useState("");
  const [disponiblesSeulement, setDisponiblesSeulement] = useState(false);

  const idUtilisateur = utilisateur?.id ?? null;

  const chargerPage = useCallback(async (numero: number) => {
    return api.get<EtudiantProfile[]>(
      `/etudiants?page=${numero}&limite=${TAILLE_PAGE}`,
    );
  }, []);

  useEffect(() => {
    if (chargementSession || !idUtilisateur) return;

    let annule = false;

    async function charger() {
      setChargement(true);
      setErreur(null);
      try {
        const liste = await chargerPage(1);
        if (annule) return;
        setEtudiants(liste);
        setPage(1);
        setPeutCharger(liste.length === TAILLE_PAGE);
      } catch (error) {
        if (annule) return;
        setErreur(
          error instanceof ApiError && error.status !== 401
            ? error.message
            : "Impossible de charger les freelances pour le moment.",
        );
      } finally {
        if (!annule) setChargement(false);
      }
    }

    void charger();

    return () => {
      annule = true;
    };
  }, [chargementSession, idUtilisateur, chargerPage]);

  async function chargerPlus() {
    setChargementPlus(true);
    setErreur(null);
    try {
      const suivante = page + 1;
      const liste = await chargerPage(suivante);
      setEtudiants((courant) => [
        ...courant,
        ...liste.filter(
          (nouveau) =>
            !courant.some((e) => e.utilisateurId === nouveau.utilisateurId),
        ),
      ]);
      setPage(suivante);
      setPeutCharger(liste.length === TAILLE_PAGE);
    } catch {
      setErreur("Impossible de charger la suite de la liste.");
    } finally {
      setChargementPlus(false);
    }
  }

  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return etudiants.filter((etudiant) => {
      if (
        disponiblesSeulement &&
        etudiant.statutDisponibilite !== "disponible"
      ) {
        return false;
      }
      if (!terme) return true;
      const texte = [
        etudiant.utilisateur?.nom,
        etudiant.universite,
        etudiant.filiere,
        etudiant.ville,
        ...(etudiant.competences ?? []),
        ...(etudiant.specialites ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return texte.includes(terme);
    });
  }, [etudiants, recherche, disponiblesSeulement]);

  // ---------------------------------------------------------------
  // Session en cours de résolution
  // ---------------------------------------------------------------
  if (chargementSession) {
    return <SqueletteListe />;
  }

  // ---------------------------------------------------------------
  // Visiteur : RG-VIS-001, profils réservés aux utilisateurs connectés
  // ---------------------------------------------------------------
  if (!utilisateur) {
    return (
      <NoticeCard className="flex flex-col items-center gap-3 py-10 text-center">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-bleu-soft text-bleu-dark"
        >
          <Lock size={19} />
        </span>
        <h2 className="font-display text-xl font-semibold text-ink">
          Les profils sont réservés aux membres
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">
          Pour protéger les étudiants, l&apos;annuaire des freelances est
          visible une fois connecté. En attendant, vous pouvez parcourir
          les services qu&apos;ils proposent.
        </p>
        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/services"
            className="inline-flex items-center justify-center rounded-lg border border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          >
            Parcourir les services
          </Link>
          <Link
            href="/connexion"
            className="inline-flex items-center justify-center rounded-lg border border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          >
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="inline-flex items-center justify-center rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft"
          >
            Rejoindre Kianja
          </Link>
        </div>
      </NoticeCard>
    );
  }

  // ---------------------------------------------------------------
  // Utilisateur connecté : annuaire
  // ---------------------------------------------------------------
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, compétence, filière, ville…"
            aria-label="Rechercher un freelance"
            className="h-11 w-full rounded-full border border-ink/15 bg-paper-light pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-bleu focus:ring-2 focus:ring-bleu/20"
          />
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={disponiblesSeulement}
            onChange={(e) => setDisponiblesSeulement(e.target.checked)}
            className="h-4 w-4 accent-[var(--theme-bleu)]"
          />
          Disponibles uniquement
        </label>
      </div>

      {erreur && (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-brique/30 bg-brique/5 px-3.5 py-3 text-sm text-brique"
        >
          {erreur}
        </p>
      )}

      {chargement ? (
        <SqueletteListe />
      ) : resultats.length === 0 ? (
        <NoticeCard className="flex flex-col items-center gap-2 py-10 text-center">
          <Users size={22} aria-hidden="true" className="text-ink-soft/60" />
          <p className="text-sm text-ink-soft">
            {etudiants.length === 0
              ? "Aucun freelance à afficher pour le moment."
              : "Aucun freelance ne correspond à votre recherche."}
          </p>
        </NoticeCard>
      ) : (
        <>
          <p className="mb-4 text-xs text-ink-soft/70" aria-live="polite">
            {resultats.length} freelance{resultats.length > 1 ? "s" : ""}{" "}
            affiché{resultats.length > 1 ? "s" : ""}
          </p>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resultats.map((etudiant) => (
              <li key={etudiant.utilisateurId}>
                <CarteFreelance etudiant={etudiant} />
              </li>
            ))}
          </ul>

          {peutCharger && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => void chargerPlus()}
                disabled={chargementPlus}
                className="inline-flex items-center justify-center rounded-lg border border-ink/30 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {chargementPlus ? "Chargement…" : "Voir plus de freelances"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CarteFreelance({ etudiant }: { etudiant: EtudiantProfile }) {
  const nom = etudiant.utilisateur?.nom ?? "Étudiant";
  const formation = [etudiant.filiere, etudiant.universite]
    .filter(Boolean)
    .join(" · ");
  const competences = (etudiant.competences ?? []).filter(Boolean);
  const affichees = competences.slice(0, COMPETENCES_AFFICHEES);
  const restantes = competences.length - affichees.length;
  const note = Number(etudiant.noteMoyenne ?? 0);
  const missions = Number(etudiant.nombreMissionsTerminees ?? 0);
  const statut = etudiant.statutDisponibilite ?? null;

  return (
    <article className="flex h-full flex-col rounded-xl border border-ink/10 bg-paper-light p-5 shadow-xs transition-colors hover:border-bleu/30">
      <div className="flex items-start gap-3">
        <Avatar
          nom={nom}
          photoUrl={etudiant.utilisateur?.photoUrl}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink">{nom}</h3>
          {formation && (
            <p className="truncate text-xs text-ink-soft">{formation}</p>
          )}
          {etudiant.ville && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft/70">
              <MapPin size={11} aria-hidden="true" />
              {etudiant.ville}
            </p>
          )}
        </div>
      </div>

      {statut && LABELS_DISPONIBILITE[statut] && (
        <div className="mt-3">
          <Tag tone={TONS_DISPONIBILITE[statut] ?? "ink"}>
            {LABELS_DISPONIBILITE[statut]}
          </Tag>
        </div>
      )}

      {affichees.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Compétences">
          {affichees.map((competence) => (
            <li key={competence}>
              <Tag>{competence}</Tag>
            </li>
          ))}
          {restantes > 0 && (
            <li>
              <Tag>+{restantes}</Tag>
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <p className="flex items-center gap-1 text-xs text-ink-soft">
          {missions > 0 ? (
            <>
              <Star
                size={12}
                aria-hidden="true"
                className="text-ocre-dark"
              />
              <span>
                {note.toFixed(1)} · {missions} mission
                {missions > 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span className="text-ink-soft/60">Nouveau sur Kianja</span>
          )}
        </p>

        <Link
          href={`/etudiants/${etudiant.utilisateurId}`}
          className="inline-flex min-h-9 items-center rounded-lg border border-ink/30 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          aria-label={`Voir le profil de ${nom}`}
        >
          Voir le profil
        </Link>
      </div>
    </article>
  );
}

function SqueletteListe() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Chargement des freelances"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-44 w-full rounded-xl" />
      ))}
    </div>
  );
}

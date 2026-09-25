"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FolderOpen,
  GraduationCap,
  Save,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NoticeCard, PageHeader } from "@/components/ui/Notice";
import { PhotoProfil } from "@/components/ui/PhotoProfil";
import type { EtudiantProfile, Utilisateur } from "@/lib/types";

/* =========================================================
   CONSTANTES
========================================================= */

const LABELS_ETAPES = [
  "Informations personnelles",
  "Études",
  "Compétences & activité",
  "Tarification",
  "Portfolio",
];

const NIVEAUX_ETUDE = ["L1", "L2", "L3", "M1", "M2", "D1", "D2", "D3"];

const TYPES_FREELANCE = [
  "Temps partiel",
  "Temps plein",
  "Mission ponctuelle",
  "Stage",
];

const STATUTS_DISPONIBILITE = [
  "disponible",
  "occupe",
  "en_mission",
  "indisponible",
];

const LABELS_STATUT_DISPONIBILITE: Record<string, string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  en_mission: "En mission",
  indisponible: "Indisponible",
};

const TELEPHONE_REGEX = /^\+?[0-9][0-9\s.-]{6,18}[0-9]$/;
const URL_REGEX = /^https?:\/\/.+/i;

/** Correspondance entre la clé backend d'un champ manquant et l'étape UI. */
const ETAPE_PAR_CHAMP: Record<string, number> = {
  photoUrl: 1,
  ville: 1,
  telephone: 1,
  universite: 2,
  niveauEtude: 2,
  filiere: 2,
  anneeEtude: 2,
  langues: 2,
  competences: 3,
  disponibilite: 3,
  tarifHoraire: 4,
  description: 5,
};

function listify(valeur: string): string[] {
  return valeur
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Ne renvoie le tableau que s'il n'est pas vide, pour ne jamais écraser
 *  une valeur déjà enregistrée lors d'une sauvegarde partielle. */
function listifyOuUndefined(valeur: string): string[] | undefined {
  const liste = listify(valeur);
  return liste.length ? liste : undefined;
}

function urlValide(valeur: string): boolean {
  return !valeur.trim() || URL_REGEX.test(valeur.trim());
}

/* =========================================================
   PAGE
========================================================= */

export default function CompleterProfilPage() {
  const { utilisateur, chargement, completionProfil, rafraichirProfil } =
    useAuth();
  const router = useRouter();

  /*
   * ==========================================================
   * GARDES D'ACCÈS
   * ==========================================================
   * - Pas connecté            -> /connexion
   * - Pas étudiant             -> /tableau-de-bord (pas de questionnaire
   *                                client pour l'instant)
   * - Profil déjà complet      -> /tableau-de-bord
   */
  useEffect(() => {
    if (chargement) return;
    if (!utilisateur) {
      router.replace("/connexion");
      return;
    }
    if (utilisateur.role !== "etudiant") {
      router.replace("/tableau-de-bord");
      return;
    }
    if (completionProfil?.complete) {
      router.replace("/tableau-de-bord");
    }
  }, [chargement, utilisateur, completionProfil, router]);

  const [etape, setEtape] = useState(1);
  const [initialise, setInitialise] = useState(false);
  const [termine, setTermine] = useState(false);

  // ---- Étape 1 : informations personnelles ----
  const [ville, setVille] = useState("");
  const [telephone, setTelephone] = useState("");

  // ---- Étape 2 : études ----
  const [universite, setUniversite] = useState("");
  const [niveauEtude, setNiveauEtude] = useState("");
  const [filiere, setFiliere] = useState("");
  const [anneeEtude, setAnneeEtude] = useState("");
  const [langues, setLangues] = useState("");

  // ---- Étape 3 : compétences et activité freelance ----
  const [competences, setCompetences] = useState("");
  const [specialites, setSpecialites] = useState("");
  const [experience, setExperience] = useState("");
  const [typeFreelance, setTypeFreelance] = useState("");
  const [disponibilite, setDisponibilite] = useState(true);
  const [statutDisponibilite, setStatutDisponibilite] = useState("");

  // ---- Étape 4 : tarification ----
  const [tarifHoraire, setTarifHoraire] = useState("");
  const [tarifMinimum, setTarifMinimum] = useState("");
  const [tarifMaximum, setTarifMaximum] = useState("");

  // ---- Étape 5 : portfolio et présence professionnelle ----
  const [description, setDescription] = useState("");
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [nouvelleUrlPortfolio, setNouvelleUrlPortfolio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [gitlabUrl, setGitlabUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [siteWeb, setSiteWeb] = useState("");

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  /*
   * ==========================================================
   * PRÉREMPLISSAGE + REPRISE APRÈS FERMETURE
   * ==========================================================
   * Les données déjà enregistrées (session précédente, inscription
   * classique ou Google) sont chargées une seule fois, et l'étape de
   * départ est calculée à partir de ce qui manque réellement — la
   * progression n'est jamais stockée côté client.
   */
  useEffect(() => {
    if (initialise || !utilisateur) return;
    const p = utilisateur.profilEtudiant;

    setVille(p?.ville ?? "");
    setTelephone(p?.telephone ?? "");
    setUniversite(p?.universite ?? "");
    setNiveauEtude(p?.niveauEtude ?? "");
    setFiliere(p?.filiere ?? "");
    setAnneeEtude(p?.anneeEtude ?? "");
    setLangues((p?.langues ?? []).join(", "));
    setCompetences((p?.competences ?? []).join(", "));
    setSpecialites((p?.specialites ?? []).join(", "));
    setExperience(p?.experience != null ? String(p.experience) : "");
    setTypeFreelance(p?.typeFreelance ?? "");
    setDisponibilite(p?.disponibilite ?? true);
    setStatutDisponibilite(p?.statutDisponibilite ?? "");
    setTarifHoraire(p?.tarifHoraire != null ? String(p.tarifHoraire) : "");
    setTarifMinimum(p?.tarifMinimum != null ? String(p.tarifMinimum) : "");
    setTarifMaximum(p?.tarifMaximum != null ? String(p.tarifMaximum) : "");
    setDescription(p?.description ?? "");
    setPortfolioUrls(p?.portfolioUrls ?? []);
    setGithubUrl(p?.githubUrl ?? "");
    setGitlabUrl(p?.gitlabUrl ?? "");
    setLinkedinUrl(p?.linkedinUrl ?? "");
    setSiteWeb(p?.siteWeb ?? "");

    if (!p?.ville?.trim() || !p?.telephone?.trim()) {
      setEtape(1);
    } else if (
      !p?.universite?.trim() ||
      !p?.niveauEtude?.trim() ||
      !p?.filiere?.trim() ||
      !p?.anneeEtude?.trim() ||
      !(p?.langues?.length)
    ) {
      setEtape(2);
    } else if (!(p?.competences?.length)) {
      setEtape(3);
    } else if (p?.tarifHoraire == null) {
      setEtape(4);
    } else {
      setEtape(5);
    }

    setInitialise(true);
  }, [utilisateur, initialise]);

  /* Une fois la dernière étape validée, on quitte le questionnaire dès
     que le backend confirme que le profil est complet. */
  useEffect(() => {
    if (termine && completionProfil?.complete) {
      router.replace("/tableau-de-bord");
    }
  }, [termine, completionProfil, router]);

  if (
    chargement ||
    !utilisateur ||
    utilisateur.role !== "etudiant" ||
    completionProfil?.complete ||
    !initialise
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-ink-soft">Chargement…</p>
      </div>
    );
  }

  /*
   * ==========================================================
   * VALIDATION PAR ÉTAPE
   * ==========================================================
   */
  function validerEtape(n: number): string | null {
    switch (n) {
      case 1:
        if (!ville.trim()) return "La ville est obligatoire.";
        if (!telephone.trim()) return "Le téléphone est obligatoire.";
        if (!TELEPHONE_REGEX.test(telephone.trim()))
          return "Le numéro de téléphone est invalide.";
        return null;
      case 2:
        if (!universite.trim()) return "L'université est obligatoire.";
        if (!niveauEtude) return "Le niveau d'étude est obligatoire.";
        if (!filiere.trim()) return "La filière est obligatoire.";
        if (!anneeEtude) return "L'année d'étude est obligatoire.";
        if (!listify(langues).length)
          return "Indiquez au moins une langue.";
        return null;
      case 3:
        if (!listify(competences).length)
          return "Indiquez au moins une compétence.";
        if (
          experience &&
          (Number(experience) < 0 || Number(experience) > 50)
        )
          return "L'expérience doit être comprise entre 0 et 50 ans.";
        return null;
      case 4:
        if (!tarifHoraire || Number(tarifHoraire) <= 0)
          return "Le tarif horaire est obligatoire et doit être positif.";
        if (tarifMinimum && Number(tarifMinimum) < 0)
          return "Le tarif minimum doit être positif.";
        if (tarifMaximum && Number(tarifMaximum) < 0)
          return "Le tarif maximum doit être positif.";
        if (
          tarifMinimum &&
          tarifMaximum &&
          Number(tarifMinimum) > Number(tarifMaximum)
        )
          return "Le tarif minimum ne peut pas dépasser le tarif maximum.";
        if (tarifMinimum && Number(tarifHoraire) < Number(tarifMinimum))
          return "Le tarif horaire ne peut pas être inférieur au tarif minimum.";
        if (tarifMaximum && Number(tarifHoraire) > Number(tarifMaximum))
          return "Le tarif horaire ne peut pas être supérieur au tarif maximum.";
        return null;
      case 5: {
        if (!description.trim()) return "La description est obligatoire.";
        const urls = [githubUrl, gitlabUrl, linkedinUrl, siteWeb, ...portfolioUrls];
        for (const url of urls) {
          if (url && !urlValide(url)) {
            return "Une des URL renseignées est invalide (elle doit commencer par http:// ou https://).";
          }
        }
        return null;
      }
      default:
        return null;
    }
  }

  /*
   * ==========================================================
   * CONSTRUCTION DE LA CHARGE PAR ÉTAPE
   * ==========================================================
   * Toujours envoyée à PATCH /etudiants/me : seuls les champs de
   * l'étape en cours sont transmis, jamais le profil entier — le
   * backend applique une mise à jour partielle (tous les champs du
   * DTO sont optionnels).
   */
  function chargeEtape(n: number): Partial<EtudiantProfile> {
    switch (n) {
      case 1:
        return {
          ville: ville.trim() || undefined,
          telephone: telephone.trim() || undefined,
        };
      case 2:
        return {
          universite: universite.trim() || undefined,
          niveauEtude: niveauEtude || undefined,
          filiere: filiere.trim() || undefined,
          anneeEtude: anneeEtude || undefined,
          langues: listifyOuUndefined(langues),
        };
      case 3:
        return {
          competences: listifyOuUndefined(competences),
          specialites: listifyOuUndefined(specialites),
          experience: experience ? Number(experience) : undefined,
          typeFreelance: typeFreelance || undefined,
          disponibilite,
          statutDisponibilite: statutDisponibilite || undefined,
        };
      case 4:
        return {
          tarifHoraire: tarifHoraire ? Number(tarifHoraire) : undefined,
          tarifMinimum: tarifMinimum ? Number(tarifMinimum) : undefined,
          tarifMaximum: tarifMaximum ? Number(tarifMaximum) : undefined,
        };
      case 5:
        return {
          description: description.trim() || undefined,
          portfolioUrls: portfolioUrls.length ? portfolioUrls : undefined,
          githubUrl: githubUrl.trim() || undefined,
          gitlabUrl: gitlabUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          siteWeb: siteWeb.trim() || undefined,
        };
      default:
        return {};
    }
  }

  async function sauvegarderEtape(n: number): Promise<boolean> {
    setErreur(null);
    setEnvoi(true);
    try {
      await api.patch<EtudiantProfile>("/etudiants/me", chargeEtape(n));
      return true;
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Une erreur inattendue est survenue.",
      );
      return false;
    } finally {
      setEnvoi(false);
    }
  }

  async function continuer() {
    const messageErreur = validerEtape(etape);
    if (messageErreur) {
      setErreur(messageErreur);
      return;
    }

    const ok = await sauvegarderEtape(etape);
    if (!ok) return;

    if (etape < 5) {
      setEtape(etape + 1);
      return;
    }

    // Dernière étape : la source de vérité (complet ou non) vient
    // exclusivement du recalcul serveur.
    await rafraichirProfil();
    setTermine(true);
  }

  function precedent() {
    setErreur(null);
    setEtape((e) => Math.max(1, e - 1));
  }

  function allerA(n: number) {
    setErreur(null);
    setTermine(false);
    setEtape(n);
  }

  async function enregistrerPlusTard() {
    setErreur(null);
    setEnvoi(true);
    try {
      await api.patch<EtudiantProfile>("/etudiants/me", chargeEtape(etape));
      await rafraichirProfil();
    } catch {
      // Sauvegarde au mieux : on quitte même si un champ était invalide,
      // les autres champs valides de l'étape ont déjà été transmis.
    } finally {
      setEnvoi(false);
      router.push("/tableau-de-bord");
    }
  }

  function ajouterUrlPortfolio() {
    const url = nouvelleUrlPortfolio.trim();
    if (!url) return;
    if (!urlValide(url)) {
      setErreur(
        "Le lien de portfolio doit commencer par http:// ou https://.",
      );
      return;
    }
    if (portfolioUrls.includes(url)) {
      setErreur("Ce lien fait déjà partie du portfolio.");
      return;
    }
    setErreur(null);
    setPortfolioUrls([...portfolioUrls, url]);
    setNouvelleUrlPortfolio("");
  }

  function retirerUrlPortfolio(index: number) {
    setPortfolioUrls(portfolioUrls.filter((_, i) => i !== index));
  }

  /*
   * ==========================================================
   * ÉCRAN DE FIN (récapitulatif si le profil reste incomplet)
   * ==========================================================
   */
  if (termine) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Sparkles}
          eyebrow="Complétion du profil"
          title="Dernière vérification…"
        />

        <NoticeCard>
          {completionProfil?.complete ? (
            <div className="flex items-center gap-3 text-rice">
              <Check size={18} />
              <p className="text-sm">
                Votre profil est complet, redirection vers votre tableau de
                bord…
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-ocre-dark">
                <CircleAlert size={18} />
                <p className="text-sm font-medium">
                  Il reste quelques informations obligatoires à compléter
                  avant l&apos;accès au tableau de bord.
                </p>
              </div>

              <ul className="flex flex-col gap-2">
                {(completionProfil?.missingFields ?? []).map((champ, i) => (
                  <li
                    key={champ}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 px-3 py-2"
                  >
                    <span className="text-sm text-ink">
                      {completionProfil?.missingLabels[i] ?? champ}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => allerA(ETAPE_PAR_CHAMP[champ] ?? 1)}
                    >
                      Corriger
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </NoticeCard>
      </div>
    );
  }

  /*
   * ==========================================================
   * RENDU DU QUESTIONNAIRE
   * ==========================================================
   */
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        eyebrow="Bienvenue sur Kianja"
        title="Complétez votre profil étudiant"
      />

      <p className="-mt-4 text-sm text-ink-soft">
        Quelques informations sont nécessaires avant d&apos;accéder à votre
        tableau de bord. Vos réponses sont enregistrées à chaque étape : vous
        pouvez fermer et reprendre plus tard.
      </p>

      <Stepper etapeActuelle={etape} onAllerA={allerA} />

      <NoticeCard>
        {etape === 1 && (
          <EtapePersonnelle
            utilisateur={utilisateur}
            ville={ville}
            setVille={setVille}
            telephone={telephone}
            setTelephone={setTelephone}
          />
        )}

        {etape === 2 && (
          <EtapeEtudes
            universite={universite}
            setUniversite={setUniversite}
            niveauEtude={niveauEtude}
            setNiveauEtude={setNiveauEtude}
            filiere={filiere}
            setFiliere={setFiliere}
            anneeEtude={anneeEtude}
            setAnneeEtude={setAnneeEtude}
            langues={langues}
            setLangues={setLangues}
          />
        )}

        {etape === 3 && (
          <EtapeCompetences
            competences={competences}
            setCompetences={setCompetences}
            specialites={specialites}
            setSpecialites={setSpecialites}
            experience={experience}
            setExperience={setExperience}
            typeFreelance={typeFreelance}
            setTypeFreelance={setTypeFreelance}
            disponibilite={disponibilite}
            setDisponibilite={setDisponibilite}
            statutDisponibilite={statutDisponibilite}
            setStatutDisponibilite={setStatutDisponibilite}
          />
        )}

        {etape === 4 && (
          <EtapeTarification
            tarifHoraire={tarifHoraire}
            setTarifHoraire={setTarifHoraire}
            tarifMinimum={tarifMinimum}
            setTarifMinimum={setTarifMinimum}
            tarifMaximum={tarifMaximum}
            setTarifMaximum={setTarifMaximum}
          />
        )}

        {etape === 5 && (
          <EtapePortfolio
            description={description}
            setDescription={setDescription}
            portfolioUrls={portfolioUrls}
            nouvelleUrlPortfolio={nouvelleUrlPortfolio}
            setNouvelleUrlPortfolio={setNouvelleUrlPortfolio}
            ajouterUrlPortfolio={ajouterUrlPortfolio}
            retirerUrlPortfolio={retirerUrlPortfolio}
            githubUrl={githubUrl}
            setGithubUrl={setGithubUrl}
            gitlabUrl={gitlabUrl}
            setGitlabUrl={setGitlabUrl}
            linkedinUrl={linkedinUrl}
            setLinkedinUrl={setLinkedinUrl}
            siteWeb={siteWeb}
            setSiteWeb={setSiteWeb}
          />
        )}

        {erreur && (
          <p className="mt-5 flex items-center gap-2 text-sm text-brique">
            <CircleAlert size={15} className="shrink-0" />
            {erreur}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={precedent}
            disabled={envoi || etape === 1}
            className="flex items-center gap-1.5"
          >
            <ChevronLeft size={16} />
            Précédent
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={enregistrerPlusTard}
              disabled={envoi}
              className="flex items-center gap-1.5"
            >
              <Save size={16} />
              Enregistrer et continuer plus tard
            </Button>

            <Button
              type="button"
              onClick={continuer}
              disabled={envoi}
              className="flex items-center gap-1.5"
            >
              {envoi
                ? "Enregistrement…"
                : etape === 5
                  ? "Terminer"
                  : "Continuer"}
              {!envoi && <ChevronRight size={16} />}
            </Button>
          </div>
        </div>
      </NoticeCard>
    </div>
  );
}

/* =========================================================
   STEPPER (INDICATEUR DE PROGRESSION)
========================================================= */

function Stepper({
  etapeActuelle,
  onAllerA,
}: {
  etapeActuelle: number;
  onAllerA: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
          Étape {etapeActuelle}/5 — {LABELS_ETAPES[etapeActuelle - 1]}
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-ocre transition-all duration-300"
          style={{ width: `${(etapeActuelle / 5) * 100}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {LABELS_ETAPES.map((label, i) => {
          const n = i + 1;
          const active = n === etapeActuelle;
          const done = n < etapeActuelle;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onAllerA(n)}
              title={label}
              className="flex shrink-0 flex-col items-center gap-1.5 px-1"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                  active
                    ? "border-ocre bg-ocre text-paper-light"
                    : done
                      ? "border-ocre-dark/50 bg-ocre/10 text-ocre-dark"
                      : "border-ink/20 text-ink-soft"
                }`}
              >
                {done ? <Check size={14} /> : n}
              </span>
              <span
                className={`hidden max-w-[6rem] text-center text-[11px] leading-tight sm:block ${
                  active ? "text-ink" : "text-ink-soft/70"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   ÉTAPE 1 — INFORMATIONS PERSONNELLES
========================================================= */

function EtapePersonnelle({
  utilisateur,
  ville,
  setVille,
  telephone,
  setTelephone,
}: {
  utilisateur: Utilisateur;
  ville: string;
  setVille: (v: string) => void;
  telephone: string;
  setTelephone: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-1 flex items-center gap-3">
        <User size={20} className="text-ocre-dark" />
        <h2 className="font-display text-xl font-semibold">
          Informations personnelles
        </h2>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <PhotoProfil utilisateur={utilisateur} size={88} />
        <div>
          <p className="font-display text-lg font-medium">
            {utilisateur.nom}
          </p>
          <p className="text-sm text-ink-soft">{utilisateur.email}</p>
          <p className="mt-1 text-xs text-ink-soft/70">
            La photo est recommandée mais facultative pour continuer.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ville *" htmlFor="ville">
          <Input
            id="ville"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Fianarantsoa"
          />
        </Field>

        <Field
          label="Téléphone *"
          htmlFor="telephone"
          hint="Utilisé uniquement pour la mise en relation."
        >
          <Input
            id="telephone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+261 34 12 345 67"
          />
        </Field>
      </div>
    </div>
  );
}

/* =========================================================
   ÉTAPE 2 — ÉTUDES
========================================================= */

function EtapeEtudes({
  universite,
  setUniversite,
  niveauEtude,
  setNiveauEtude,
  filiere,
  setFiliere,
  anneeEtude,
  setAnneeEtude,
  langues,
  setLangues,
}: {
  universite: string;
  setUniversite: (v: string) => void;
  niveauEtude: string;
  setNiveauEtude: (v: string) => void;
  filiere: string;
  setFiliere: (v: string) => void;
  anneeEtude: string;
  setAnneeEtude: (v: string) => void;
  langues: string;
  setLangues: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-1 flex items-center gap-3">
        <GraduationCap size={20} className="text-ocre-dark" />
        <h2 className="font-display text-xl font-semibold">Études</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Université / établissement *" htmlFor="universite">
          <Input
            id="universite"
            value={universite}
            onChange={(e) => setUniversite(e.target.value)}
            placeholder="EMIT Fianarantsoa"
          />
        </Field>

        <Field label="Filière *" htmlFor="filiere">
          <Input
            id="filiere"
            value={filiere}
            onChange={(e) => setFiliere(e.target.value)}
            placeholder="Informatique"
          />
        </Field>

        <Field label="Niveau d'étude *" htmlFor="niveauEtude">
          <Select
            id="niveauEtude"
            value={niveauEtude}
            onChange={(e) => setNiveauEtude(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {NIVEAUX_ETUDE.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Année d'étude *" htmlFor="anneeEtude">
          <Select
            id="anneeEtude"
            value={anneeEtude}
            onChange={(e) => setAnneeEtude(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {NIVEAUX_ETUDE.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Langues *"
        htmlFor="langues"
        hint="Séparez chaque langue par une virgule."
      >
        <Input
          id="langues"
          value={langues}
          onChange={(e) => setLangues(e.target.value)}
          placeholder="Français, Malagasy, Anglais"
        />
      </Field>
    </div>
  );
}

/* =========================================================
   ÉTAPE 3 — COMPÉTENCES ET ACTIVITÉ FREELANCE
========================================================= */

function EtapeCompetences({
  competences,
  setCompetences,
  specialites,
  setSpecialites,
  experience,
  setExperience,
  typeFreelance,
  setTypeFreelance,
  disponibilite,
  setDisponibilite,
  statutDisponibilite,
  setStatutDisponibilite,
}: {
  competences: string;
  setCompetences: (v: string) => void;
  specialites: string;
  setSpecialites: (v: string) => void;
  experience: string;
  setExperience: (v: string) => void;
  typeFreelance: string;
  setTypeFreelance: (v: string) => void;
  disponibilite: boolean;
  setDisponibilite: (v: boolean) => void;
  statutDisponibilite: string;
  setStatutDisponibilite: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-1 flex items-center gap-3">
        <Sparkles size={20} className="text-ocre-dark" />
        <h2 className="font-display text-xl font-semibold">
          Compétences et activité freelance
        </h2>
      </div>

      <Field
        label="Compétences *"
        htmlFor="competences"
        hint="Séparez chaque compétence par une virgule."
      >
        <Input
          id="competences"
          value={competences}
          onChange={(e) => setCompetences(e.target.value)}
          placeholder="React, NestJS, Flutter"
        />
      </Field>

      <Field
        label="Spécialités"
        htmlFor="specialites"
        hint="Domaines d'intervention principaux (facultatif)."
      >
        <Input
          id="specialites"
          value={specialites}
          onChange={(e) => setSpecialites(e.target.value)}
          placeholder="Développement mobile, UI/UX"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Expérience (années)" htmlFor="experience">
          <Input
            id="experience"
            type="number"
            min={0}
            max={50}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="2"
          />
        </Field>

        <Field label="Type de freelance" htmlFor="typeFreelance">
          <Select
            id="typeFreelance"
            value={typeFreelance}
            onChange={(e) => setTypeFreelance(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {TYPES_FREELANCE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Statut de disponibilité" htmlFor="statutDisponibilite">
          <Select
            id="statutDisponibilite"
            value={statutDisponibilite}
            onChange={(e) => setStatutDisponibilite(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {STATUTS_DISPONIBILITE.map((s) => (
              <option key={s} value={s}>
                {LABELS_STATUT_DISPONIBILITE[s]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
            Disponibilité *
          </span>
          <label className="flex items-center gap-2.5 rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={disponibilite}
              onChange={(e) => setDisponibilite(e.target.checked)}
              className="h-4 w-4 accent-ocre"
            />
            Disponible pour de nouvelles missions
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ÉTAPE 4 — TARIFICATION
========================================================= */

function EtapeTarification({
  tarifHoraire,
  setTarifHoraire,
  tarifMinimum,
  setTarifMinimum,
  tarifMaximum,
  setTarifMaximum,
}: {
  tarifHoraire: string;
  setTarifHoraire: (v: string) => void;
  tarifMinimum: string;
  setTarifMinimum: (v: string) => void;
  tarifMaximum: string;
  setTarifMaximum: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-1 flex items-center gap-3">
        <Wallet size={20} className="text-ocre-dark" />
        <h2 className="font-display text-xl font-semibold">Tarification</h2>
      </div>

      <Field
        label="Tarif horaire (Ar) *"
        htmlFor="tarifHoraire"
        hint="Doit rester compris entre le tarif minimum et le tarif maximum si vous les renseignez."
      >
        <Input
          id="tarifHoraire"
          type="number"
          min={0}
          value={tarifHoraire}
          onChange={(e) => setTarifHoraire(e.target.value)}
          placeholder="20000"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tarif minimum (Ar)" htmlFor="tarifMinimum">
          <Input
            id="tarifMinimum"
            type="number"
            min={0}
            value={tarifMinimum}
            onChange={(e) => setTarifMinimum(e.target.value)}
            placeholder="15000"
          />
        </Field>

        <Field label="Tarif maximum (Ar)" htmlFor="tarifMaximum">
          <Input
            id="tarifMaximum"
            type="number"
            min={0}
            value={tarifMaximum}
            onChange={(e) => setTarifMaximum(e.target.value)}
            placeholder="50000"
          />
        </Field>
      </div>
    </div>
  );
}

/* =========================================================
   ÉTAPE 5 — PORTFOLIO ET PRÉSENCE PROFESSIONNELLE
========================================================= */

function EtapePortfolio({
  description,
  setDescription,
  portfolioUrls,
  nouvelleUrlPortfolio,
  setNouvelleUrlPortfolio,
  ajouterUrlPortfolio,
  retirerUrlPortfolio,
  githubUrl,
  setGithubUrl,
  gitlabUrl,
  setGitlabUrl,
  linkedinUrl,
  setLinkedinUrl,
  siteWeb,
  setSiteWeb,
}: {
  description: string;
  setDescription: (v: string) => void;
  portfolioUrls: string[];
  nouvelleUrlPortfolio: string;
  setNouvelleUrlPortfolio: (v: string) => void;
  ajouterUrlPortfolio: () => void;
  retirerUrlPortfolio: (i: number) => void;
  githubUrl: string;
  setGithubUrl: (v: string) => void;
  gitlabUrl: string;
  setGitlabUrl: (v: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (v: string) => void;
  siteWeb: string;
  setSiteWeb: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-1 flex items-center gap-3">
        <FolderOpen size={20} className="text-ocre-dark" />
        <h2 className="font-display text-xl font-semibold">
          Portfolio et présence professionnelle
        </h2>
      </div>

      <Field label="Description *" htmlFor="description">
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Présentez-vous en quelques phrases : parcours, projets, ce que vous proposez…"
        />
      </Field>

      <Field
        label="Liens de portfolio"
        htmlFor="nouvelleUrlPortfolio"
        hint="URL complète (https://…)."
      >
        <div className="flex gap-2">
          <Input
            id="nouvelleUrlPortfolio"
            value={nouvelleUrlPortfolio}
            onChange={(e) => setNouvelleUrlPortfolio(e.target.value)}
            placeholder="https://monportfolio.com"
            className="flex-1"
          />
          <Button type="button" variant="ghost" onClick={ajouterUrlPortfolio}>
            Ajouter
          </Button>
        </div>
      </Field>

      {portfolioUrls.length > 0 && (
        <ul className="flex flex-col gap-2">
          {portfolioUrls.map((url, i) => (
            <li
              key={url}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 px-3 py-2 text-sm"
            >
              <span className="truncate text-ink-soft">{url}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => retirerUrlPortfolio(i)}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="GitHub" htmlFor="githubUrl">
          <Input
            id="githubUrl"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/monprofil"
          />
        </Field>

        <Field label="GitLab" htmlFor="gitlabUrl">
          <Input
            id="gitlabUrl"
            value={gitlabUrl}
            onChange={(e) => setGitlabUrl(e.target.value)}
            placeholder="https://gitlab.com/monprofil"
          />
        </Field>

        <Field label="LinkedIn" htmlFor="linkedinUrl">
          <Input
            id="linkedinUrl"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/monprofil"
          />
        </Field>

        <Field label="Site web" htmlFor="siteWeb">
          <Input
            id="siteWeb"
            value={siteWeb}
            onChange={(e) => setSiteWeb(e.target.value)}
            placeholder="https://monsite.mg"
          />
        </Field>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import {
  User,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  Languages,
  Wallet,
  CircleCheck,
  CircleX,
  Star,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  FileText,
  Pencil,
  X,
  Palette,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  Link2,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { MessageVide, NoticeCard, PageHeader, Tag } from "@/components/ui/Notice";
import { PhotoProfil } from "@/components/ui/PhotoProfil";
import { PortfolioGalerie, estImageUrl } from "@/components/ui/Portfolio";
import { SelecteurTheme } from "@/components/ui/SelecteurTheme";
import { ThemeCondition } from "@/components/ui/ThemeCondition";
import type { ClientProfile, EtudiantProfile, Utilisateur } from "@/lib/types";

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

export default function ProfilPage() {
  const { utilisateur } = useAuth();

  if (!utilisateur) return null;

  return (
    <div className="space-y-8">
      {utilisateur.role === "etudiant" ? (
        <ProfilEtudiant utilisateur={utilisateur} />
      ) : utilisateur.role === "client" ? (
        <ProfilClient utilisateur={utilisateur} />
      ) : (
        <div className="space-y-6">
          <PageHeader icon={User} eyebrow="Votre compte" title="Mon profil" />

          <NoticeCard>
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
                <User size={20} />
              </span>

              <div>
                <p className="font-display text-lg font-medium">
                  {utilisateur.nom}
                </p>
                <p className="text-sm text-ink-soft">{utilisateur.email}</p>
              </div>
            </div>

            <p className="mt-5 text-sm text-ink-soft">
              Les administrateurs n&apos;ont pas de profil public à modifier.
            </p>
          </NoticeCard>
        </div>
      )}

      {/* =========================================================
          SECTION APPARENCE & THÈME
      ========================================================= */}
      <ThemeCondition>
        <section aria-labelledby="theme-section-title" className="pt-2">
          <PageHeader
            icon={Palette}
            eyebrow="Personnalisation"
            title="Apparence & Thème"
          />

          <NoticeCard>
            <SelecteurTheme variante="complet" />
          </NoticeCard>
        </section>
      </ThemeCondition>
    </div>
  );
}

/* =========================================================
   PROFIL ÉTUDIANT
========================================================= */

function ProfilEtudiant({ utilisateur }: { utilisateur: Utilisateur }) {
  const { rafraichirProfil } = useAuth();

  const profil = utilisateur.profilEtudiant;

  const [gestion, setGestion] = useState(false);

  const [niveauEtude, setNiveauEtude] = useState(profil?.niveauEtude ?? "");

  const [universite, setUniversite] = useState(profil?.universite ?? "");

  const [filiere, setFiliere] = useState(profil?.filiere ?? "");

  const [anneeEtude, setAnneeEtude] = useState(profil?.anneeEtude ?? "");

  const [ville, setVille] = useState(profil?.ville ?? "");

  const [telephone, setTelephone] = useState(profil?.telephone ?? "");

  const [description, setDescription] = useState(profil?.description ?? "");

  const [competences, setCompetences] = useState(
    profil?.competences?.join(", ") ?? "",
  );

  const [specialites, setSpecialites] = useState(
    profil?.specialites?.join(", ") ?? "",
  );

  const [experience, setExperience] = useState(
    profil?.experience != null ? String(profil.experience) : "",
  );

  const [typeFreelance, setTypeFreelance] = useState(
    profil?.typeFreelance ?? "",
  );

  const [statutDisponibilite, setStatutDisponibilite] = useState(
    profil?.statutDisponibilite ?? "",
  );

  const [langues, setLangues] = useState(profil?.langues?.join(", ") ?? "");

  const [tarifHoraire, setTarifHoraire] = useState(
    profil?.tarifHoraire != null ? String(profil.tarifHoraire) : "",
  );

  const [tarifMinimum, setTarifMinimum] = useState(
    profil?.tarifMinimum != null ? String(profil.tarifMinimum) : "",
  );

  const [tarifMaximum, setTarifMaximum] = useState(
    profil?.tarifMaximum != null ? String(profil.tarifMaximum) : "",
  );

  const [disponibilite, setDisponibilite] = useState(
    profil?.disponibilite ?? true,
  );

  const [githubUrl, setGithubUrl] = useState(profil?.githubUrl ?? "");

  const [gitlabUrl, setGitlabUrl] = useState(profil?.gitlabUrl ?? "");

  const [linkedinUrl, setLinkedinUrl] = useState(profil?.linkedinUrl ?? "");

  const [siteWeb, setSiteWeb] = useState(profil?.siteWeb ?? "");

  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(
    profil?.portfolioUrls ?? [],
  );

  const [nouvelleUrlPortfolio, setNouvelleUrlPortfolio] = useState("");

  const [erreurUrlPortfolio, setErreurUrlPortfolio] = useState<string | null>(
    null,
  );

  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErreur(null);
    setMessage(null);

    if (
      tarifMinimum &&
      tarifMaximum &&
      Number(tarifMinimum) > Number(tarifMaximum)
    ) {
      setErreur("Le tarif minimum ne peut pas dépasser le tarif maximum.");
      return;
    }
    if (
      tarifHoraire &&
      tarifMinimum &&
      Number(tarifHoraire) < Number(tarifMinimum)
    ) {
      setErreur(
        "Le tarif horaire ne peut pas être inférieur au tarif minimum.",
      );
      return;
    }
    if (
      tarifHoraire &&
      tarifMaximum &&
      Number(tarifHoraire) > Number(tarifMaximum)
    ) {
      setErreur(
        "Le tarif horaire ne peut pas être supérieur au tarif maximum.",
      );
      return;
    }
    setEnvoi(true);

    try {
      await api.patch<EtudiantProfile>("/etudiants/me", {
        niveauEtude: niveauEtude || undefined,
        universite: universite || undefined,
        filiere: filiere || undefined,
        anneeEtude: anneeEtude || undefined,
        ville: ville || undefined,
        telephone: telephone || undefined,
        description: description || undefined,

        competences: competences
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),

        specialites: specialites
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),

        experience: experience ? Number(experience) : undefined,
        typeFreelance: typeFreelance || undefined,
        statutDisponibilite: statutDisponibilite || undefined,

        langues: langues
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),

        tarifHoraire: tarifHoraire ? Number(tarifHoraire) : undefined,
        tarifMinimum: tarifMinimum ? Number(tarifMinimum) : undefined,
        tarifMaximum: tarifMaximum ? Number(tarifMaximum) : undefined,

        disponibilite,

        githubUrl: githubUrl || undefined,
        gitlabUrl: gitlabUrl || undefined,
        linkedinUrl: linkedinUrl || undefined,
        siteWeb: siteWeb || undefined,

        portfolioUrls,
      });

      await rafraichirProfil();

      setMessage("Votre profil a été mis à jour.");

      setGestion(false);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  function annulerModification() {
    setNiveauEtude(profil?.niveauEtude ?? "");
    setUniversite(profil?.universite ?? "");
    setFiliere(profil?.filiere ?? "");
    setAnneeEtude(profil?.anneeEtude ?? "");
    setVille(profil?.ville ?? "");
    setTelephone(profil?.telephone ?? "");
    setDescription(profil?.description ?? "");

    setCompetences(profil?.competences?.join(", ") ?? "");
    setSpecialites(profil?.specialites?.join(", ") ?? "");
    setExperience(profil?.experience != null ? String(profil.experience) : "");
    setTypeFreelance(profil?.typeFreelance ?? "");
    setStatutDisponibilite(profil?.statutDisponibilite ?? "");

    setLangues(profil?.langues?.join(", ") ?? "");

    setTarifHoraire(
      profil?.tarifHoraire != null ? String(profil.tarifHoraire) : "",
    );
    setTarifMinimum(
      profil?.tarifMinimum != null ? String(profil.tarifMinimum) : "",
    );
    setTarifMaximum(
      profil?.tarifMaximum != null ? String(profil.tarifMaximum) : "",
    );

    setDisponibilite(profil?.disponibilite ?? true);

    setGithubUrl(profil?.githubUrl ?? "");
    setGitlabUrl(profil?.gitlabUrl ?? "");
    setLinkedinUrl(profil?.linkedinUrl ?? "");
    setSiteWeb(profil?.siteWeb ?? "");

    setPortfolioUrls(profil?.portfolioUrls ?? []);

    setNouvelleUrlPortfolio("");
    setErreurUrlPortfolio(null);

    setErreur(null);
    setMessage(null);
    setGestion(false);
  }

  /** Ajoute une URL au portfolio (lien externe ou chemin d'upload relatif). */
  function ajouterUrlPortfolio() {
    const url = nouvelleUrlPortfolio.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      setErreurUrlPortfolio(
        "Utilisez un lien complet (https://…) ou un chemin d'upload (/uploads/…).",
      );
      return;
    }

    if (portfolioUrls.includes(url)) {
      setErreurUrlPortfolio("Ce lien fait déjà partie du portfolio.");
      return;
    }

    setErreurUrlPortfolio(null);
    setPortfolioUrls([...portfolioUrls, url]);
    setNouvelleUrlPortfolio("");
  }

  function retirerUrlPortfolio(index: number) {
    setErreurUrlPortfolio(null);
    setPortfolioUrls(portfolioUrls.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <PageHeader icon={User} eyebrow="Votre compte" title="Mon profil" />

      {/* =================================================
          IDENTITÉ
      ================================================= */}

      <NoticeCard>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <PhotoProfil utilisateur={utilisateur} size={96} />

            <div>
              <p className="font-display text-2xl font-semibold">
                {utilisateur.nom}
              </p>

              <p className="mt-1 text-sm text-ink-soft">{utilisateur.email}</p>

              <div className="mt-3">
                <Tag>Étudiant</Tag>
              </div>
            </div>
          </div>

          {!gestion && (
            <Button
              variant="primary"
              onClick={() => {
                setMessage(null);
                setErreur(null);
                setGestion(true);
              }}
              className="flex items-center justify-center gap-2"
            >
              <Pencil size={16} />
              Gérer mon profil
            </Button>
          )}
        </div>
      </NoticeCard>

      {/* =================================================
          MESSAGE
      ================================================= */}

      {message && (
        <NoticeCard>
          <div className="flex items-center gap-3 text-rice">
            <CircleCheck size={18} />

            <p className="text-sm">{message}</p>
          </div>
        </NoticeCard>
      )}

      {/* =================================================
          AFFICHAGE DU PROFIL
      ================================================= */}

      {!gestion && (
        <>
          {/* Coordonnées */}

          <NoticeCard>
            <div className="mb-6 flex items-center gap-3">
              <MapPin size={20} className="text-ocre-dark" />

              <h2 className="font-display text-xl font-semibold">
                Coordonnées
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <InfoItem
                icon={MapPin}
                label="Ville"
                value={profil?.ville || "Non renseigné"}
              />

              <InfoItem
                icon={Phone}
                label="Téléphone"
                value={profil?.telephone || "Non renseigné"}
              />
            </div>
          </NoticeCard>

          {/* Informations générales */}

          <NoticeCard>
            <div className="mb-6 flex items-center gap-3">
              <GraduationCap size={20} className="text-ocre-dark" />

              <h2 className="font-display text-xl font-semibold">
                Informations académiques
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <InfoItem
                icon={GraduationCap}
                label="Niveau d'étude"
                value={profil?.niveauEtude || "Non renseigné"}
              />

              <InfoItem
                icon={Building2}
                label="Université / établissement"
                value={profil?.universite || "Non renseigné"}
              />

              <InfoItem
                icon={BriefcaseBusiness}
                label="Filière"
                value={profil?.filiere || "Non renseigné"}
              />

              <InfoItem
                icon={GraduationCap}
                label="Année d'étude"
                value={profil?.anneeEtude || "Non renseigné"}
              />
            </div>
          </NoticeCard>

          {/* Présentation */}

          <NoticeCard>
            <div className="mb-5 flex items-center gap-3">
              <FileText size={20} className="text-ocre-dark" />

              <h2 className="font-display text-xl font-semibold">
                Présentation
              </h2>
            </div>

            <p className="text-sm leading-7 text-ink-soft">
              {profil?.description || "Aucune présentation renseignée."}
            </p>
          </NoticeCard>

          {/* Compétences et langues */}

          <div className="grid gap-6 lg:grid-cols-2">
            <NoticeCard>
              <div className="mb-5 flex items-center gap-3">
                <BriefcaseBusiness size={20} className="text-ocre-dark" />

                <h2 className="font-display text-xl font-semibold">
                  Compétences
                </h2>
              </div>

              {profil?.competences?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profil.competences.map((competence) => (
                    <Tag key={competence}>
                      {competence}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  Aucune compétence renseignée.
                </p>
              )}

              {profil?.specialites?.length ? (
                <div className="mt-4 border-t border-ink/10 pt-4">
                  <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">
                    Spécialités
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profil.specialites.map((specialite) => (
                      <Tag key={specialite} tone="ocre">
                        {specialite}
                      </Tag>
                    ))}
                  </div>
                </div>
              ) : null}
            </NoticeCard>

            <NoticeCard>
              <div className="mb-5 flex items-center gap-3">
                <Languages size={20} className="text-ocre-dark" />

                <h2 className="font-display text-xl font-semibold">Langues</h2>
              </div>

              {profil?.langues?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profil.langues.map((langue) => (
                    <Tag key={langue} tone="ocre">
                      {langue}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  Aucune langue renseignée.
                </p>
              )}
            </NoticeCard>
          </div>

          {/* Activité freelance */}

          <NoticeCard>
            <div className="mb-6 flex items-center gap-3">
              <Sparkles size={20} className="text-ocre-dark" />

              <h2 className="font-display text-xl font-semibold">
                Activité freelance
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <InfoItem
                icon={Clock}
                label="Expérience"
                value={
                  profil?.experience != null
                    ? `${profil.experience} an${profil.experience > 1 ? "s" : ""}`
                    : "Non renseigné"
                }
              />

              <InfoItem
                icon={BriefcaseBusiness}
                label="Type de freelance"
                value={profil?.typeFreelance || "Non renseigné"}
              />

              <InfoItem
                icon={CircleCheck}
                label="Statut de disponibilité"
                value={
                  LABELS_STATUT_DISPONIBILITE[profil?.statutDisponibilite ?? ""] ||
                  profil?.statutDisponibilite ||
                  "Non renseigné"
                }
              />
            </div>
          </NoticeCard>

          {/* Tarif et disponibilité */}

          <div className="grid gap-6 sm:grid-cols-2">
            <NoticeCard>
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
                  <Wallet size={20} />
                </span>

                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-soft">
                    Tarif horaire
                  </p>

                  <p className="mt-1 font-display text-xl font-semibold">
                    {profil?.tarifHoraire != null
                      ? `${Number(profil.tarifHoraire).toLocaleString(
                          "fr-FR",
                        )} Ar`
                      : "Non renseigné"}
                  </p>

                  {(profil?.tarifMinimum != null ||
                    profil?.tarifMaximum != null) && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Fourchette :{" "}
                      {profil?.tarifMinimum != null
                        ? `${Number(profil.tarifMinimum).toLocaleString("fr-FR")} Ar`
                        : "—"}{" "}
                      –{" "}
                      {profil?.tarifMaximum != null
                        ? `${Number(profil.tarifMaximum).toLocaleString("fr-FR")} Ar`
                        : "—"}
                    </p>
                  )}
                </div>
              </div>
            </NoticeCard>

            <NoticeCard>
              <div className="flex items-center gap-4">
                {profil?.disponibilite ? (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rice/10 text-rice">
                    <CircleCheck size={20} />
                  </span>
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brique/10 text-brique">
                    <CircleX size={20} />
                  </span>
                )}

                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-soft">
                    Disponibilité
                  </p>

                  <p className="mt-1 font-display text-xl font-semibold">
                    {profil?.disponibilite ? "Disponible" : "Indisponible"}
                  </p>
                </div>
              </div>
            </NoticeCard>
          </div>

          {/* Réputation */}

          <NoticeCard>
            <div className="mb-6 flex items-center gap-3">
              <Star size={20} className="text-ocre-dark" />

              <h2 className="font-display text-xl font-semibold">Réputation</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <InfoItem
                icon={Star}
                label="Score de réputation"
                value={
                  profil?.scoreReputation != null
                    ? Number(profil.scoreReputation).toFixed(1)
                    : "0"
                }
              />

              <InfoItem
                icon={Star}
                label="Note moyenne"
                value={
                  profil?.noteMoyenne != null
                    ? `${Number(profil.noteMoyenne).toFixed(1)} / 5`
                    : "0 / 5"
                }
              />

              <InfoItem
                icon={CircleCheck}
                label="Missions terminées"
                value={
                  profil?.nombreMissionsTerminees != null
                    ? String(profil.nombreMissionsTerminees)
                    : "0"
                }
              />
            </div>
          </NoticeCard>

          {/* Portfolio */}

          <NoticeCard>
            <div className="mb-6 flex items-center gap-3">
              <FolderOpen size={20} className="text-ocre-dark" />

              <h2 className="font-display text-xl font-semibold">Portfolio</h2>
            </div>

            {(profil?.portfolioUrls ?? []).filter(Boolean).length > 0 ? (
              <PortfolioGalerie urls={profil?.portfolioUrls ?? []} />
            ) : (
              <MessageVide>
                Aucun projet dans le portfolio pour le moment. Cliquez sur
                « Gérer mon profil » pour ajouter vos réalisations.
              </MessageVide>
            )}

            {(profil?.githubUrl ||
              profil?.gitlabUrl ||
              profil?.linkedinUrl ||
              profil?.siteWeb) && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-5">
                {profil?.githubUrl && (
                  <a
                    href={profil.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Link2 size={13} />
                    GitHub
                  </a>
                )}
                {profil?.gitlabUrl && (
                  <a
                    href={profil.gitlabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Link2 size={13} />
                    GitLab
                  </a>
                )}
                {profil?.linkedinUrl && (
                  <a
                    href={profil.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Link2 size={13} />
                    LinkedIn
                  </a>
                )}
                {profil?.siteWeb && (
                  <a
                    href={profil.siteWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ocre hover:text-ocre-dark"
                  >
                    <Globe size={13} />
                    Site web
                  </a>
                )}
              </div>
            )}
          </NoticeCard>
        </>
      )}

      {/* =================================================
          FORMULAIRE DE GESTION
      ================================================= */}

      {gestion && (
        <NoticeCard>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
                Gestion
              </p>

              <h2 className="mt-1 font-display text-2xl font-semibold">
                Modifier mon profil
              </h2>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={annulerModification}
              title="Annuler"
              aria-label="Annuler"
            >
              <X size={18} />
            </Button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Niveau d'étude" htmlFor="niveauEtude">
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

              <Field label="Établissement" htmlFor="universite">
                <Input
                  id="universite"
                  value={universite}
                  onChange={(e) => setUniversite(e.target.value)}
                  placeholder="EMIT Fianarantsoa"
                />
              </Field>

              <Field label="Filière" htmlFor="filiere">
                <Input
                  id="filiere"
                  value={filiere}
                  onChange={(e) => setFiliere(e.target.value)}
                  placeholder="Informatique"
                />
              </Field>

              <Field label="Année d'étude" htmlFor="anneeEtude">
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

              <Field label="Ville" htmlFor="ville">
                <Input
                  id="ville"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  placeholder="Fianarantsoa"
                />
              </Field>

              <Field label="Téléphone" htmlFor="telephone">
                <Input
                  id="telephone"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+261 34 12 345 67"
                />
              </Field>
            </div>

            <Field label="Présentation" htmlFor="description">
              <Textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre parcours, vos expériences et ce que vous proposez..."
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

            <Field
              label="Spécialités"
              htmlFor="specialites"
              hint="Séparées par des virgules"
            >
              <Input
                id="specialites"
                value={specialites}
                onChange={(e) => setSpecialites(e.target.value)}
                placeholder="Développement mobile, UI/UX"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
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
            </div>

            <Field
              label="Langues"
              htmlFor="langues"
              hint="Séparées par des virgules"
            >
              <Input
                id="langues"
                value={langues}
                onChange={(e) => setLangues(e.target.value)}
                placeholder="Malagasy, Français, Anglais"
              />
            </Field>

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

            <Field
              label="Portfolio"
              htmlFor="portfolioUrl"
              hint="Lien vers un projet, un site ou une image (https://…)"
            >
              <div className="flex gap-2">
                <Input
                  id="portfolioUrl"
                  value={nouvelleUrlPortfolio}
                  onChange={(e) => setNouvelleUrlPortfolio(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      ajouterUrlPortfolio();
                    }
                  }}
                  placeholder="https://monportfolio.com"
                />

                <Button
                  type="button"
                  variant="ghost"
                  onClick={ajouterUrlPortfolio}
                  disabled={envoi || !nouvelleUrlPortfolio.trim()}
                >
                  Ajouter
                </Button>
              </div>
            </Field>

            {erreurUrlPortfolio && (
              <p className="text-xs text-brique">{erreurUrlPortfolio}</p>
            )}

            {portfolioUrls.length > 0 && (
              <ul className="flex flex-col gap-2">
                {portfolioUrls.map((url, index) => (
                  <li
                    key={`${url}-${index}`}
                    className="flex items-center gap-2.5 rounded-lg border border-ink/20 bg-ink/[0.02] px-3 py-2"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink-soft"
                      aria-hidden="true"
                    >
                      {estImageUrl(url) ? (
                        <ImageIcon size={13} />
                      ) : (
                        <Globe size={13} />
                      )}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {url}
                    </span>

                    <button
                      type="button"
                      onClick={() => retirerUrlPortfolio(index)}
                      disabled={envoi}
                      aria-label={`Retirer ${url} du portfolio`}
                      className="shrink-0 text-ink-soft/60 transition-colors hover:text-brique disabled:opacity-50"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Tarif minimum (Ar)" htmlFor="tarifMinimum">
                <Input
                  id="tarifMinimum"
                  type="number"
                  min={0}
                  value={tarifMinimum}
                  onChange={(e) => setTarifMinimum(e.target.value)}
                  placeholder="10000"
                />
              </Field>

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

              <Field label="Tarif maximum (Ar)" htmlFor="tarifMaximum">
                <Input
                  id="tarifMaximum"
                  type="number"
                  min={0}
                  value={tarifMaximum}
                  onChange={(e) => setTarifMaximum(e.target.value)}
                  placeholder="30000"
                />
              </Field>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={disponibilite}
                  onChange={(e) => setDisponibilite(e.target.checked)}
                  className="h-4 w-4 accent-ocre"
                />
                Disponible pour de nouvelles missions
              </label>
            </div>

            {erreur && <p className="text-sm text-brique">{erreur}</p>}

            {message && <p className="text-sm text-rice">{message}</p>}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={envoi}>
                {envoi ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={annulerModification}
                disabled={envoi}
              >
                Annuler
              </Button>
            </div>
          </form>
        </NoticeCard>
      )}
    </div>
  );
}

/* =========================================================
   PROFIL CLIENT
========================================================= */

function ProfilClient({ utilisateur }: { utilisateur: Utilisateur }) {
  const { rafraichirProfil } = useAuth();

  const profil = utilisateur.profilClient;

  const [gestion, setGestion] = useState(false);

  const [nomEntreprise, setNomEntreprise] = useState(
    profil?.nomEntreprise ?? "",
  );

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

      await rafraichirProfil();

      setMessage("Votre profil a été mis à jour.");

      setGestion(false);
    } catch (err) {
      setErreur(
        err instanceof ApiError
          ? err.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  function annulerModification() {
    setTypeClient(profil?.typeClient ?? "particulier");

    setNomEntreprise(profil?.nomEntreprise ?? "");

    setErreur(null);
    setMessage(null);
    setGestion(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={User} eyebrow="Votre compte" title="Mon profil" />

      {/* Identité */}

      <NoticeCard>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <PhotoProfil utilisateur={utilisateur} size={96} />

            <div>
              <p className="font-display text-2xl font-semibold">
                {utilisateur.nom}
              </p>

              <p className="mt-1 text-sm text-ink-soft">{utilisateur.email}</p>

              <div className="mt-3">
                <Tag tone="ocre">Client</Tag>
              </div>
            </div>
          </div>

          {!gestion && (
            <Button
              variant="primary"
              onClick={() => {
                setMessage(null);
                setErreur(null);
                setGestion(true);
              }}
            >
              <Pencil size={16} />
              Gérer mon profil
            </Button>
          )}
        </div>
      </NoticeCard>

      {/* Message */}

      {message && (
        <NoticeCard>
          <div className="flex items-center gap-3 text-rice">
            <CircleCheck size={18} />

            <p className="text-sm">{message}</p>
          </div>
        </NoticeCard>
      )}

      {/* Consultation */}

      {!gestion && (
        <NoticeCard>
          <div className="mb-6 flex items-center gap-3">
            <Building2 size={20} className="text-ocre-dark" />

            <h2 className="font-display text-xl font-semibold">
              Informations du compte
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <InfoItem
              icon={Building2}
              label="Type de compte"
              value={
                profil?.typeClient === "entreprise"
                  ? "Entreprise"
                  : "Particulier"
              }
            />

            {profil?.typeClient === "entreprise" && (
              <InfoItem
                icon={BriefcaseBusiness}
                label="Nom de l'entreprise"
                value={profil.nomEntreprise || "Non renseigné"}
              />
            )}
          </div>
        </NoticeCard>
      )}

      {/* Formulaire */}

      {gestion && (
        <NoticeCard>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
                Gestion
              </p>

              <h2 className="mt-1 font-display text-2xl font-semibold">
                Modifier mon profil
              </h2>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={annulerModification}
              title="Annuler"
              aria-label="Annuler"
            >
              <X size={18} />
            </Button>
          </div>

          <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-5">
            <Field label="Type de compte" htmlFor="typeClient">
              <select
                id="typeClient"
                value={typeClient}
                onChange={(e) =>
                  setTypeClient(e.target.value as "particulier" | "entreprise")
                }
                className="rounded-lg border border-ink/30 bg-paper-light px-3 py-2.5 text-sm"
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

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={envoi}>
                {envoi ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={annulerModification}
                disabled={envoi}
              >
                Annuler
              </Button>
            </div>
          </form>
        </NoticeCard>
      )}
    </div>
  );
}

/* =========================================================
   COMPOSANT INFORMATION
========================================================= */

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ocre/10 text-ocre-dark">
        <Icon size={17} />
      </span>

      <div>
        <p className="text-xs uppercase tracking-wider text-ink-soft">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

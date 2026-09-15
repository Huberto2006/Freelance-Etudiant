"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Package,
  MessageCircle,
  ExternalLink,
  FileUp,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  ChevronRight,
  Search,
  FolderGit2,
  Wallet,
  Timer,
  Check,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

import type {
  Candidature,
  Evaluation,
  Livraison,
  PieceJointeLivraison,
  Transaction,
} from "@/lib/types";

import { formatArgent, formatDateCourte, statutLivraisonLabel } from "@/lib/format";
import { getFileUrl } from "@/lib/api";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/Field";

import {
  NoticeCard,
  PageHeader,
  StatCard,
  Tag,
} from "@/components/ui/Notice";
import { BoutonRetour } from "@/components/ui/BoutonRetour";
import { SousNavigation } from "@/components/ui/SousNavigation";

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function LivraisonsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <p className="text-sm text-ink-soft">
            Chargement…
          </p>
        </div>
      }
    >
      <LivraisonsContent />
    </Suspense>
  );
}

// ============================================================
// CONTENU
// ============================================================

function LivraisonsContent() {
  const searchParams = useSearchParams();

  // L'ID de candidature sert uniquement à sélectionner
  // la livraison concernée par une notification.
  const candidatureParam =
    searchParams.get("candidature");

  const {
    utilisateur,
    chargement: chargementAuth,
  } = useAuth();

  const [
    candidatures,
    setCandidatures,
  ] = useState<Candidature[]>([]);

  const [
    livraisons,
    setLivraisons,
  ] = useState<Livraison[]>([]);

  // Paiements du client connecté (GET /paiements/me) : ils permettent
  // de connaître l'état réel du paiement de chaque candidature
  // (en attente / confirmé / libéré / annulé) et d'afficher le
  // workflow de fin de projet dans LivraisonClient. Source de
  // vérité : le backend (le frontend n'évalue jamais un paiement).
  const [
    paiements,
    setPaiements,
  ] = useState<Transaction[]>([]);

  // Chargeur exposé via une ref : permet à LivraisonClient de
  // provoquer un rafraîchissement silencieux des données (sans
  // recharger toute la page) après une évaluation réussie.
  const rafraichirRef =
    useRef<
      | ((
          silencieux?: boolean,
        ) => Promise<void>)
      | null
    >(null);

  async function rafraichirDonnees() {
    await rafraichirRef.current?.(true);
  }

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    erreur,
    setErreur,
  ] = useState<string | null>(null);

  // Sous-menu actif : À traiter / Corrections demandées /
  // En attente de validation / Validées.
  const [
    ongletLivraisons,
    setOngletLivraisons,
  ] = useState("toutes");

  const [recherche, setRecherche] = useState("");
  const [filtreClient, setFiltreClient] = useState("");
  const [filtreMission, setFiltreMission] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreMethode, setFiltreMethode] = useState("");

  // ==========================================================
  // RÔLE RÉEL DE L'UTILISATEUR
  // ==========================================================

  const role =
    utilisateur?.role === "client"
      ? "client"
      : utilisateur?.role === "etudiant"
        ? "etudiant"
        : null;

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    // Attendre que AuthContext ait terminé
    // de restaurer la session utilisateur.
    if (
      chargementAuth ||
      !utilisateur ||
      !role
    ) {
      return;
    }

    let cancelled = false;

    async function chargerInitial(
      silencieux = false,
    ) {
      if (!silencieux) {
        setChargement(true);
      }
      setErreur(null);

      try {
        // ======================================================
        // CLIENT
        // ======================================================

        if (role === "client") {
          const [
            livraisonsData,
            paiementsData,
          ] = await Promise.all([
            api.get<Livraison[]>(
              "/livraisons/client/toutes",
            ),

            // Un échec du chargement des paiements (ex. erreur
            // réseau ponctuelle) ne doit pas masquer les
            // livraisons : on continue avec une liste vide.
            api
              .get<Transaction[]>(
                "/paiements/me",
              )
              .catch(
                () => [] as Transaction[],
              ),
          ]);

          if (cancelled) {
            return;
          }

          setLivraisons(livraisonsData);
          setPaiements(paiementsData);

          /*
           * Les candidatures sont déjà présentes
           * dans les livraisons renvoyées par le backend.
           */
          const candidaturesDepuisLivraisons =
            livraisonsData
              .map(
                (livraison) =>
                  livraison.candidature,
              )
              .filter(
                (
                  candidature,
                ): candidature is Candidature =>
                  Boolean(candidature),
              );

          setCandidatures(
            candidaturesDepuisLivraisons,
          );

          return;
        }

        // ======================================================
        // ÉTUDIANT
        // ======================================================

        const [
          candidaturesData,
          livraisonsData,
        ] = await Promise.all([
          api.get<Candidature[]>(
            "/candidatures/me",
          ),

          api.get<Livraison[]>(
            "/livraisons/me",
          ),
        ]);

        if (cancelled) {
          return;
        }

        setCandidatures(
          candidaturesData,
        );

        setLivraisons(
          livraisonsData,
        );
      } catch (error) {
        console.error(
          "Erreur lors du chargement des livraisons :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : "Impossible de charger vos livraisons.",
          );
        }
      } finally {
        if (!cancelled && !silencieux) {
          setChargement(false);
        }
      }
    }

    // Le rafraîchissement silencieux réutilise le même chargeur ;
    // le garde "cancelled" du rendu d'effet courant neutralise les
    // mises à jour d'état après démontage ou changement de session.
    rafraichirRef.current = chargerInitial;

    void chargerInitial();

    return () => {
      cancelled = true;
    };
  }, [
    chargementAuth,
    utilisateur,
    role,
  ]);

  // ==========================================================
  // CALCULS
  // Aucun Hook ici.
  // ==========================================================

  const candidaturesFiltrees =
    role === "client"
      ? candidatures
      : candidatures.filter(
          (candidature) =>
            candidature.statut ===
            "acceptee",
        );

  // Catégorie de sous-menu correspondant à la livraison (ou son
  // absence) d'une candidature. Sert uniquement à filtrer la liste
  // affichée : la sélection (candidatureSelectionnee) reste calculée
  // sur l'ensemble complet pour ne pas casser les liens venant des
  // notifications.
  function categorieLivraison(
    candidature: Candidature,
  ): "a_traiter" | "corrections" | "attente_validation" | "validees" {
    const livraison = livraisons.find(
      (item) => item.candidatureId === candidature.id,
    );

    if (!livraison) return "a_traiter";
    if (livraison.statut === "correction_demandee") return "corrections";
    if (livraison.statut === "validee") return "validees";
    return "attente_validation";
  }

  const compteLivraisons = {
    a_traiter: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "a_traiter",
    ).length,
    corrections: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "corrections",
    ).length,
    attente_validation: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "attente_validation",
    ).length,
    validees: candidaturesFiltrees.filter(
      (c) => categorieLivraison(c) === "validees",
    ).length,
  };

  function livraisonPour(candidature: Candidature) {
    return livraisons.find((item) => item.candidatureId === candidature.id);
  }

  function methodeLivraison(livraison: Livraison | undefined) {
    if (livraison?.piecesJointes?.length) return "fichiers";
    if (livraison?.lienLivrable?.toLowerCase().includes("gitlab.com")) return "gitlab";
    if (livraison?.lienLivrable) return "github";
    return "";
  }

  // Identité de l'autre partie affichée sur chaque ligne / le panneau
  // de détail : l'étudiant pour un client, le client pour un étudiant.
  function infosAutrePersonne(candidature: Candidature) {
    if (role === "client") {
      return {
        nom: candidature.etudiant?.utilisateur?.nom ?? "Étudiant",
        photoUrl: candidature.etudiant?.utilisateur?.photoUrl ?? null,
        label: "Étudiant",
      };
    }
    return {
      nom:
        candidature.mission?.client?.utilisateur?.nom ??
        candidature.mission?.client?.nomEntreprise ??
        "Client",
      photoUrl: candidature.mission?.client?.utilisateur?.photoUrl ?? null,
      label: "Client",
    };
  }

  const candidaturesAvecFiltres = candidaturesFiltrees.filter((candidature) => {
    const livraison = livraisonPour(candidature);
    const client = candidature.mission?.client?.utilisateur?.nom ?? candidature.mission?.client?.nomEntreprise ?? "";
    const mission = candidature.mission?.titre ?? "";
    const texte = `${client} ${mission} ${candidature.missionId} ${livraison?.id ?? ""}`.toLowerCase();
    return (
      (!recherche.trim() || texte.includes(recherche.trim().toLowerCase())) &&
      (!filtreClient || client === filtreClient) &&
      (!filtreMission || mission === filtreMission) &&
      (!filtreStatut || livraison?.statut === filtreStatut) &&
      (!filtreMethode || methodeLivraison(livraison) === filtreMethode)
    );
  });

  const candidaturesAffichees =
    ongletLivraisons === "toutes"
      ? candidaturesAvecFiltres
      : candidaturesAvecFiltres.filter(
          (c) => categorieLivraison(c) === ongletLivraisons,
        );

  // Contrairement à l'ancienne disposition « maître-détail » (liste +
  // détail toujours visibles côte à côte), l'écran de détail n'est
  // affiché que si une candidature est explicitement demandée via
  // l'URL (clic sur « Voir » ou lien depuis une notification). Sans
  // paramètre, l'écran liste (cartes stats + tableau) reste affiché.
  const candidatureSelectionnee = candidatureParam
    ? (candidaturesFiltrees.find(
        (candidature) => candidature.id === candidatureParam,
      ) ?? candidaturesFiltrees[0] ?? null)
    : null;

  const livraisonSelectionnee =
    candidatureSelectionnee
      ? livraisons.find(
          (livraison) =>
            livraison.candidatureId ===
            candidatureSelectionnee.id,
        ) ?? null
      : null;

  // ==========================================================
  // CHARGEMENT DE LA SESSION
  // ==========================================================

  if (chargementAuth) {
    return (
      <div>
        <p className="text-sm text-ink-soft">
          Vérification de votre session…
        </p>
      </div>
    );
  }

  // ==========================================================
  // UTILISATEUR NON CONNECTÉ
  // ==========================================================

  if (!utilisateur) {
    return (
      <div>
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            Vous devez être connecté pour
            consulter vos livraisons.
          </p>

          <Link
            href="/connexion"
            className="mt-4 inline-block"
          >
            <Button
              size="sm"
              variant="secondary"
            >
              Se connecter
            </Button>
          </Link>
        </NoticeCard>
      </div>
    );
  }

  // ==========================================================
  // ADMIN / RÔLE NON AUTORISÉ
  // ==========================================================

  if (!role) {
    return (
      <div>
        <NoticeCard>
          <p className="text-sm text-brique">
            Vous n&apos;êtes pas autorisé à
            consulter les livraisons.
          </p>
        </NoticeCard>
      </div>
    );
  }

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  // ==========================================================
  // ÉCRAN DE DÉTAIL (une livraison sélectionnée via l'URL)
  // ==========================================================

  if (candidatureSelectionnee) {
    const infos = infosAutrePersonne(candidatureSelectionnee);

    return (
      <div>
        {/* FIL D'ARIANE + RETOUR */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            <Link
              href="/tableau-de-bord/livraisons"
              className="hover:text-ink hover:underline"
            >
              Livraisons
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-ink">Détail</span>
          </nav>

          <BoutonRetour
            label="Retour"
            repli="/tableau-de-bord/livraisons"
            forcer
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* CONTENU PRINCIPAL */}

          <div>
            {role === "client" ? (
              livraisonSelectionnee ? (
                <LivraisonClient
                  key={candidatureSelectionnee.id}
                  candidature={candidatureSelectionnee}
                  livraison={livraisonSelectionnee}
                  paiements={paiements}
                  onRafraichir={rafraichirDonnees}
                />
              ) : (
                <NoticeCard>
                  <p className="text-sm text-ink-soft">
                    Aucune livraison n&apos;a encore été déposée.
                  </p>
                </NoticeCard>
              )
            ) : (
              <LivraisonEtudiant
                key={candidatureSelectionnee.id}
                candidature={candidatureSelectionnee}
                livraison={livraisonSelectionnee}
              />
            )}
          </div>

          {/* PANNEAU LATÉRAL — DÉTAILS DE LA MISSION */}

          <div className="flex flex-col gap-5">
            <NoticeCard>
              <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                Détails de la mission
              </p>

              <Link
                href={`/missions/${candidatureSelectionnee.missionId}`}
                className="mt-3 block"
              >
                <Button size="sm" variant="ghost" className="w-full">
                  Voir la mission
                </Button>
              </Link>

              <div className="mt-4 space-y-3 border-t border-ink/15 pt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Wallet size={15} className="shrink-0 text-ink-soft" aria-hidden="true" />
                  <span>{formatArgent(candidatureSelectionnee.prixPropose)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Timer size={15} className="shrink-0 text-ink-soft" aria-hidden="true" />
                  <span>
                    Livraison : {candidatureSelectionnee.delaiPropose} jour
                    {candidatureSelectionnee.delaiPropose > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Avatar
                    nom={infos.nom}
                    photoUrl={infos.photoUrl}
                    size={22}
                  />
                  <span>
                    {infos.label} : {infos.nom}
                  </span>
                </div>
              </div>

              {livraisonSelectionnee && (
                <div className="mt-4 border-t border-ink/15 pt-4">
                  <p className="mb-2 text-xs text-ink-soft">
                    Statut de la livraison
                  </p>
                  <Tag
                    tone={
                      livraisonSelectionnee.statut === "validee"
                        ? "rice"
                        : livraisonSelectionnee.statut === "correction_demandee"
                          ? "brique"
                          : "ocre"
                    }
                  >
                    {statutLivraisonLabel[livraisonSelectionnee.statut]}
                  </Tag>
                </div>
              )}
            </NoticeCard>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ÉCRAN LISTE
  // ==========================================================

  return (
    <div>

      <PageHeader
        icon={
          role === "client"
            ? Users
            : Package
        }
        eyebrow={
          role === "client"
            ? "Espace client"
            : "Espace étudiant"
        }
        title={
          role === "client"
            ? "Livraisons reçues"
            : "Mes livraisons"
        }
      />

      {/* ========================================================
          ERREUR
          ======================================================== */}

      {erreur && (
        <NoticeCard className="mb-6">
          <p className="text-sm text-brique">
            {erreur}
          </p>
        </NoticeCard>
      )}

      {/* ========================================================
          CARTES STATISTIQUES
          ======================================================== */}

      {!chargement && candidaturesFiltrees.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setOngletLivraisons("a_traiter")}
            className="text-left"
          >
            <StatCard
              icon={Package}
              tone="ink"
              label="À traiter"
              value={compteLivraisons.a_traiter}
              sublabel="Livraisons à envoyer"
            />
          </button>

          <button
            type="button"
            onClick={() => setOngletLivraisons("corrections")}
            className="text-left"
          >
            <StatCard
              icon={XCircle}
              tone="brique"
              label="Corrections demandées"
              value={compteLivraisons.corrections}
              sublabel="À reprendre"
            />
          </button>

          <button
            type="button"
            onClick={() => setOngletLivraisons("attente_validation")}
            className="text-left"
          >
            <StatCard
              icon={Clock}
              tone="ocre"
              label="En attente de validation"
              value={compteLivraisons.attente_validation}
              sublabel="Chez le client"
            />
          </button>

          <button
            type="button"
            onClick={() => setOngletLivraisons("validees")}
            className="text-left"
          >
            <StatCard
              icon={CheckCircle}
              tone="rice"
              label="Livraisons validées"
              value={compteLivraisons.validees}
              sublabel="Terminées"
            />
          </button>
        </div>
      )}

      {/* ========================================================
          FILTRES
          ======================================================== */}

      {!chargement && candidaturesFiltrees.length > 0 && (
        <div className="mb-6 grid gap-3 rounded-xl border border-ink/15 bg-paper p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
              aria-hidden="true"
            />
            <Input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un client, une mission…"
              aria-label="Rechercher une livraison"
              className="pl-9"
            />
          </div>
          <Select value={filtreClient} onChange={(event) => setFiltreClient(event.target.value)} aria-label="Filtrer par client">
            <option value="">Tous les clients</option>
            {Array.from(new Set(candidaturesFiltrees.map((c) => c.mission?.client?.utilisateur?.nom ?? c.mission?.client?.nomEntreprise ?? "Client"))).map((client) => <option key={client} value={client}>{client}</option>)}
          </Select>
          <Select value={filtreMission} onChange={(event) => setFiltreMission(event.target.value)} aria-label="Filtrer par mission">
            <option value="">Toutes les missions</option>
            {Array.from(new Set(candidaturesFiltrees.map((c) => c.mission?.titre ?? "Mission"))).map((mission) => <option key={mission} value={mission}>{mission}</option>)}
          </Select>
          <Select value={filtreStatut} onChange={(event) => setFiltreStatut(event.target.value)} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {Object.entries(statutLivraisonLabel).map(([valeur, label]) => <option key={valeur} value={valeur}>{label}</option>)}
          </Select>
          <Select value={filtreMethode} onChange={(event) => setFiltreMethode(event.target.value)} aria-label="Filtrer par méthode">
            <option value="">Toutes les méthodes</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
            <option value="fichiers">Fichiers</option>
          </Select>
        </div>
      )}

      {/* ========================================================
          CHARGEMENT DES DONNÉES
          ======================================================== */}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          Chargement des livraisons…
        </p>
      ) : candidaturesFiltrees.length ===
        0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {role === "client"
              ? "Vous n'avez aucune livraison reçue pour le moment."
              : "Vous n'avez actuellement aucune candidature acceptée."}
          </p>

          <Link
            href={
              role === "client"
                ? "/tableau-de-bord/mes-missions"
                : "/tableau-de-bord/candidatures"
            }
            className="mt-4 inline-block"
          >
            <Button
              size="sm"
              variant="ghost"
            >
              {role === "client"
                ? "Voir mes missions"
                : "Voir mes candidatures"}
            </Button>
          </Link>
        </NoticeCard>
      ) : (
        <>
          <SousNavigation
            onglets={[
              {
                valeur: "toutes",
                label: "Toutes",
                compte: candidaturesFiltrees.length,
              },
              {
                valeur: "a_traiter",
                label: "À traiter",
                compte: compteLivraisons.a_traiter,
              },
              {
                valeur: "corrections",
                label: "Corrections demandées",
                compte: compteLivraisons.corrections,
              },
              {
                valeur: "attente_validation",
                label: "En attente de validation",
                compte: compteLivraisons.attente_validation,
              },
              {
                valeur: "validees",
                label: "Validées",
                compte: compteLivraisons.validees,
              },
            ]}
            actif={ongletLivraisons}
            onChanger={setOngletLivraisons}
          />

          {/* ====================================================
              LISTE (lignes façon tableau)
              ==================================================== */}

          <div className="flex flex-col gap-3">
            {candidaturesAffichees.length === 0 && (
              <NoticeCard>
                <p className="text-sm text-ink-soft">
                  Aucune livraison dans cette catégorie.
                </p>
              </NoticeCard>
            )}

            {candidaturesAffichees.map((candidature) => {
              const livraison = livraisonPour(candidature);
              const infos = infosAutrePersonne(candidature);
              const methode = methodeLivraison(livraison);

              return (
                <NoticeCard
                  key={candidature.id}
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                    {/* PERSONNE */}
                    <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
                      <Avatar nom={infos.nom} photoUrl={infos.photoUrl} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{infos.nom}</p>
                        <p className="text-xs text-ink-soft">{infos.label}</p>
                      </div>
                    </div>

                    {/* MISSION */}
                    <div className="min-w-0 sm:flex-1">
                      <p className="truncate text-sm font-medium">
                        {candidature.mission?.titre ?? "Mission"}
                      </p>
                      {candidature.mission?.categorie && (
                        <Tag tone="ink">{candidature.mission.categorie}</Tag>
                      )}
                    </div>

                    {/* MÉTHODE */}
                    <div className="flex items-center gap-1.5 text-xs text-ink-soft sm:w-32 sm:shrink-0">
                      {(methode === "github" || methode === "gitlab") && (
                        <FolderGit2 size={14} aria-hidden="true" />
                      )}
                      {methode === "fichiers" && <FileUp size={14} aria-hidden="true" />}
                      <span>
                        {methode === "github"
                          ? `GitHub${livraison?.branche ? ` · ${livraison.branche}` : ""}`
                          : methode === "gitlab"
                            ? `GitLab${livraison?.branche ? ` · ${livraison.branche}` : ""}`
                            : methode === "fichiers"
                              ? `${livraison?.piecesJointes?.length ?? 0} fichier${(livraison?.piecesJointes?.length ?? 0) > 1 ? "s" : ""}`
                              : "—"}
                      </span>
                    </div>

                    {/* DATE */}
                    <div className="text-xs text-ink-soft sm:w-20 sm:shrink-0">
                      {formatDateCourte(
                        livraison?.dateLivraison ?? candidature.dateCandidature,
                      )}
                    </div>

                    {/* STATUT */}
                    <div className="sm:w-40 sm:shrink-0">
                      <Tag
                        tone={
                          !livraison
                            ? "ink"
                            : livraison.statut === "validee"
                              ? "rice"
                              : livraison.statut === "correction_demandee"
                                ? "brique"
                                : "ocre"
                        }
                      >
                        {livraison ? statutLivraisonLabel[livraison.statut] : "Aucune livraison"}
                      </Tag>
                    </div>
                  </div>

                  <Link
                    href={`/tableau-de-bord/livraisons?candidature=${encodeURIComponent(candidature.id)}`}
                    className="shrink-0"
                  >
                    <Button size="sm" variant="ghost">
                      Voir
                    </Button>
                  </Link>
                </NoticeCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// LIVRAISON ÉTUDIANT
// ============================================================

function LivraisonEtudiant({
  candidature,
  livraison,
}: {
  candidature: Candidature;
  livraison: Livraison | null;
}) {
  const clientId =
    candidature.mission?.client
      ?.utilisateur?.id ??
    candidature.mission?.clientId ??
    undefined;

  const clientNom =
    candidature.mission?.client
      ?.utilisateur?.nom ??
    candidature.mission?.client
      ?.nomEntreprise ??
    "Client";

  const [lienLivrable, setLienLivrable] = useState(
    livraison?.lienLivrable ?? "",
  );
  const [plateforme, setPlateforme] = useState<"github" | "gitlab">(
    livraison?.lienLivrable?.toLowerCase().includes("gitlab.com")
      ? "gitlab"
      : "github",
  );
  const [methode, setMethode] = useState<"depot" | "fichiers">(
    livraison?.piecesJointes?.length ? "fichiers" : "depot",
  );
  const [branche, setBranche] = useState(livraison?.branche ?? "");
  const [piecesJointes, setPiecesJointes] = useState<PieceJointeLivraison[]>(
    livraison?.piecesJointes ?? [],
  );
  const [uploadEnCours, setUploadEnCours] = useState(false);

  const [
    commentaireLivraison,
    setCommentaireLivraison,
  ] = useState(
    livraison?.commentaireLivraison ??
      "",
  );

  const [envoi, setEnvoi] =
    useState(false);

  const [erreur, setErreur] =
    useState<string | null>(null);

  // Étapes du formulaire de dépôt : 1) méthode, 2) informations,
  // 3) aperçu avant envoi. N'a d'effet que sur la présentation ; la
  // soumission (onSubmit) reste inchangée.
  const [etape, setEtape] = useState<1 | 2 | 3>(1);

  function etapeSuivante() {
    if (etape === 2) {
      const lien = lienLivrable.trim();
      if (methode === "depot" && !lien) {
        setErreur("Veuillez renseigner le lien vers votre livrable.");
        return;
      }
      if (methode === "fichiers" && !piecesJointes.length) {
        setErreur("Ajoutez au moins un fichier avant de continuer.");
        return;
      }
    }
    setErreur(null);
    setEtape((precedente) => (precedente < 3 ? ((precedente + 1) as 1 | 2 | 3) : precedente));
  }

  function etapePrecedente() {
    setErreur(null);
    setEtape((precedente) => (precedente > 1 ? ((precedente - 1) as 1 | 2 | 3) : precedente));
  }

  async function ajouterFichiers(files: FileList | File[]) {
    const selections = Array.from(files);
    if (!selections.length) return;
    if (piecesJointes.length + selections.length > 10) {
      setErreur("Maximum 10 fichiers par livraison.");
      return;
    }
    setErreur(null);
    setUploadEnCours(true);
    try {
      const nouveaux: PieceJointeLivraison[] = [];
      for (const file of selections) {
        const formData = new FormData();
        formData.append("file", file);
        const resultat = await api.upload<{
          url: string;
          nomFichier: string;
          tailleOctets: number;
        }>("/uploads/document", formData);
        nouveaux.push({
          url: resultat.url,
          nom: resultat.nomFichier,
          tailleOctets: resultat.tailleOctets,
        });
      }
      setPiecesJointes((precedentes) => [...precedentes, ...nouveaux]);
    } catch (error) {
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'ajouter ce fichier.",
      );
    } finally {
      setUploadEnCours(false);
    }
  }

  // ==========================================================
  // ENVOYER / MODIFIER LIVRAISON
  // ==========================================================

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (envoi) {
      return;
    }

    const lien = lienLivrable.trim();
    if (methode === "depot" && !lien) {
      setErreur(
        "Veuillez renseigner le lien vers votre livrable.",
      );
      return;
    }
    if (methode === "fichiers" && !piecesJointes.length) {
      setErreur("Ajoutez au moins un fichier avant l'envoi.");
      return;
    }

    setErreur(null);
    setEnvoi(true);
    try {
      await api.post(`/candidatures/${candidature.id}/livraison`, {
        lienLivrable: methode === "depot" ? lien : undefined,
        plateforme: methode === "depot" ? plateforme : undefined,
        branche: methode === "depot" ? branche.trim() || undefined : undefined,
        piecesJointes: methode === "fichiers" ? piecesJointes : undefined,
        commentaireLivraison: commentaireLivraison.trim() || undefined,
      });
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de l'envoi de la livraison :", error);
      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible d'envoyer la livraison.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <NoticeCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Livraison
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              "Mission"}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            Client : {clientNom}
          </p>
        </div>

        {clientId && (
          <Link
            href={`/tableau-de-bord/messages?contact=${encodeURIComponent(
              clientId,
            )}&nom=${encodeURIComponent(
              clientNom,
            )}`}
          >
            <Button
              size="sm"
              variant="ghost"
              className="inline-flex items-center gap-2"
            >
              <MessageCircle
                size={16}
              />
              Discuter avec le client
            </Button>
          </Link>
        )}
      </div>

      {/* STATUT */}

      {livraison && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <Tag
            tone={
              livraison.statut ===
              "validee"
                ? "rice"
                : livraison.statut ===
                    "correction_demandee"
                  ? "brique"
                  : "ink"
            }
          >
            {
              statutLivraisonLabel[
                livraison.statut
              ]
            }
          </Tag>
        </div>
      )}

      {/* CORRECTION */}

      {livraison?.statut ===
        "correction_demandee" &&
        livraison.commentaireCorrection && (
          <div className="mt-5 rounded-lg border border-brique/20 bg-brique/5 p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-brique">
              Correction demandée
            </p>

            <p className="mt-2 text-sm text-ink">
              {
                livraison.commentaireCorrection
              }
            </p>
          </div>
        )}

      {/* VALIDATION */}

      {livraison?.statut ===
        "validee" && (
        <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
          <p className="text-sm text-rice">
            Votre livraison a été validée
            par le client.
          </p>
        </div>
      )}

      {/* LIEN */}

      {livraison?.lienLivrable && (
        <div className="mt-5">
          <a
            href={
              livraison.lienLivrable
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-sm text-ocre-dark hover:underline"
          >
            <ExternalLink size={15} />
            Ouvrir le livrable
          </a>
        </div>
      )}

      {/* FORMULAIRE — présenté en 3 étapes : méthode, informations, aperçu */}

      {livraison?.statut !==
        "validee" && (
        <div className="mt-6 max-w-xl border-t border-ink/15 pt-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {livraison
              ? "Modifier ma livraison"
              : "Déposer ma livraison"}
          </p>

          {/* INDICATEUR D'ÉTAPES */}

          <div className="mt-4 flex items-center">
            {(
              [
                { numero: 1, label: "Méthode" },
                { numero: 2, label: "Informations" },
                { numero: 3, label: "Aperçu" },
              ] as const
            ).map((item, index) => (
              <div
                key={item.numero}
                className={`flex items-center ${index < 2 ? "flex-1" : ""}`}
              >
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-mono ${
                      etape === item.numero
                        ? "bg-ocre-dark text-paper-light"
                        : etape > item.numero
                          ? "bg-rice text-paper-light"
                          : "border border-ink/25 text-ink-soft"
                    }`}
                  >
                    {etape > item.numero ? <Check size={13} aria-hidden="true" /> : item.numero}
                  </span>
                  <span
                    className={`hidden text-xs sm:inline ${etape === item.numero ? "font-medium text-ink" : "text-ink-soft"}`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <span className="mx-2 h-px flex-1 bg-ink/15" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6">
            {/* ÉTAPE 1 : MÉTHODE */}

            {etape === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMethode("depot")}
                  className={`relative border p-3 text-left text-sm ${methode === "depot" ? "border-ocre-dark bg-ocre/10" : "border-ink/20"}`}
                >
                  {methode === "depot" && (
                    <Check size={14} className="absolute right-3 top-3 text-ocre-dark" aria-hidden="true" />
                  )}
                  <span className="font-medium">Lien de dépôt</span>
                  <span className="mt-1 block text-xs text-ink-soft">GitHub ou GitLab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethode("fichiers")}
                  className={`relative border p-3 text-left text-sm ${methode === "fichiers" ? "border-ocre-dark bg-ocre/10" : "border-ink/20"}`}
                >
                  {methode === "fichiers" && (
                    <Check size={14} className="absolute right-3 top-3 text-ocre-dark" aria-hidden="true" />
                  )}
                  <span className="font-medium">Fichiers</span>
                  <span className="mt-1 block text-xs text-ink-soft">Jusqu&apos;à 10 fichiers</span>
                </button>
              </div>
            )}

            {/* ÉTAPE 2 : INFORMATIONS */}

            {etape === 2 &&
              (methode === "depot" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Plateforme" htmlFor={`plateforme-${candidature.id}`}>
                    <Select
                      id={`plateforme-${candidature.id}`}
                      value={plateforme}
                      onChange={(event) => setPlateforme(event.target.value as "github" | "gitlab")}
                      disabled={envoi}
                    >
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                    </Select>
                  </Field>
                  <Field label="Branche (optionnel)" htmlFor={`branche-${candidature.id}`}>
                    <Input
                      id={`branche-${candidature.id}`}
                      value={branche}
                      onChange={(event) => setBranche(event.target.value)}
                      placeholder="main"
                      disabled={envoi}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="URL du dépôt" htmlFor={`lien-${candidature.id}`}>
                      <Input
                        id={`lien-${candidature.id}`}
                        value={lienLivrable}
                        onChange={(event) => setLienLivrable(event.target.value)}
                        placeholder={plateforme === "github" ? "https://github.com/…" : "https://gitlab.com/…"}
                        disabled={envoi}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Commentaire" htmlFor={`commentaire-${candidature.id}`}>
                      <Textarea
                        id={`commentaire-${candidature.id}`}
                        rows={4}
                        value={commentaireLivraison}
                        onChange={(event) => setCommentaireLivraison(event.target.value)}
                        placeholder="Précisions sur votre livraison…"
                        disabled={envoi}
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor={`fichiers-${candidature.id}`}
                    className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-ink/30 p-6 text-center text-sm hover:border-ocre-dark"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void ajouterFichiers(event.dataTransfer.files);
                    }}
                  >
                    <FileUp size={20} />
                    <span>{uploadEnCours ? "Envoi des fichiers…" : "Sélectionner ou déposer des fichiers"}</span>
                    <span className="text-xs text-ink-soft">PDF, Word, Excel, image, archive ou texte</span>
                    <input
                      id={`fichiers-${candidature.id}`}
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        void ajouterFichiers(event.target.files ?? []);
                        event.target.value = "";
                      }}
                      disabled={envoi || uploadEnCours}
                    />
                  </label>
                  {piecesJointes.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm">
                      {piecesJointes.map((piece, index) => (
                        <li key={`${piece.url}-${index}`} className="flex items-center justify-between gap-3 border border-ink/10 px-3 py-2">
                          <span className="min-w-0 truncate">{piece.nom} <span className="text-xs text-ink-soft">({Math.ceil((piece.tailleOctets ?? 0) / 1024)} Ko)</span></span>
                          <button type="button" onClick={() => setPiecesJointes((precedentes) => precedentes.filter((_, pieceIndex) => pieceIndex !== index))} aria-label={`Supprimer ${piece.nom}`} className="shrink-0 text-brique">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4">
                    <Field label="Commentaire" htmlFor={`commentaire-${candidature.id}`}>
                      <Textarea
                        id={`commentaire-${candidature.id}`}
                        rows={4}
                        value={commentaireLivraison}
                        onChange={(event) => setCommentaireLivraison(event.target.value)}
                        placeholder="Précisions sur votre livraison…"
                        disabled={envoi}
                      />
                    </Field>
                  </div>
                </div>
              ))}

            {/* ÉTAPE 3 : APERÇU */}

            {etape === 3 && (
              <div className="space-y-3 rounded-lg border border-ink/15 bg-ink/5 p-4 text-sm">
                <p>
                  <span className="text-ink-soft">Méthode : </span>
                  {methode === "depot"
                    ? `Lien de dépôt (${plateforme === "github" ? "GitHub" : "GitLab"})`
                    : "Fichiers"}
                </p>

                {methode === "depot" ? (
                  <>
                    <p className="break-all">
                      <span className="text-ink-soft">URL : </span>
                      {lienLivrable || "—"}
                    </p>
                    {branche && (
                      <p>
                        <span className="text-ink-soft">Branche : </span>
                        {branche}
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    <span className="text-ink-soft">Fichiers : </span>
                    {piecesJointes.length} fichier{piecesJointes.length > 1 ? "s" : ""}
                  </p>
                )}

                {commentaireLivraison && (
                  <p>
                    <span className="text-ink-soft">Commentaire : </span>
                    {commentaireLivraison}
                  </p>
                )}
              </div>
            )}

            {erreur && (
              <p className="mt-3 text-xs text-brique">
                {erreur}
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={etapePrecedente}
                disabled={etape === 1 || envoi}
              >
                Précédent
              </Button>

              {etape < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={etapeSuivante}
                  disabled={envoi || uploadEnCours}
                >
                  Suivant
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    envoi ||
                    uploadEnCours ||
                    (methode === "depot" ? !lienLivrable.trim() : !piecesJointes.length)
                  }
                >
                  {envoi
                    ? "Envoi…"
                    : livraison
                      ? "Mettre à jour la livraison"
                      : "Déposer ma livraison"}
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </NoticeCard>
  );
}

// ============================================================
// LIVRAISON CLIENT
// ============================================================

function LivraisonClient({
  candidature,
  livraison,
  paiements,
  onRafraichir,
}: {
  candidature: Candidature;
  livraison: Livraison;
  paiements: Transaction[];
  onRafraichir: () => Promise<void>;
}) {
  const etudiantId =
    candidature.etudiant
      ?.utilisateur?.id ??
    undefined;

  const etudiantNom =
    candidature.etudiant
      ?.utilisateur?.nom ??
    "Étudiant";

  const [
    commentaireCorrection,
    setCommentaireCorrection,
  ] = useState(
    livraison.commentaireCorrection ??
      "",
  );

  const [envoi, setEnvoi] =
    useState(false);

  const [erreur, setErreur] =
    useState<string | null>(null);

  const [statut, setStatut] =
    useState(livraison.statut);

  const [action, setAction] =
    useState<
      "valider" | "corriger" | null
    >(null);

  // ==========================================================
  // ÉVALUATION OBLIGATOIRE (fin de projet)
  //
  // Règle métier backend (EvaluationsService.create) :
  //   livraison validée + paiement CONFIRMEE/LIBEREE
  //   + une seule évaluation par livraison.
  // Le formulaire n'est affiché que lorsque ces conditions
  // sont réunies côté frontend ; le backend reste la
  // protection principale en cas d'appel direct à l'API.
  // ==========================================================

  // Note choisie : 0 = aucune, 1 à 5 sinon.
  const [note, setNote] =
    useState(0);

  const [
    commentaireEvaluation,
    setCommentaireEvaluation,
  ] = useState("");

  const [
    evaluationEnvoi,
    setEvaluationEnvoi,
  ] = useState(false);

  const [
    evaluationErreur,
    setEvaluationErreur,
  ] = useState<string | null>(null);

  // Réussite locale de l'évaluation : empêche une deuxième
  // soumission dès la première réussite, même avant le
  // rafraîchissement des données (le backend rejette de
  // toute façon un second appel avec 409).
  const [
    evaluationEnvoyee,
    setEvaluationEnvoyee,
  ] = useState(false);

  // ==========================================================
  // ÉTAT DU WORKFLOW DE FIN DE PROJET
  // Dérivé des statuts renvoyés par le backend :
  //   livraison validee + paiement confirmee/liberee
  //   + evaluation effectuee -> projet termine.
  // ==========================================================

  const paiementsCandidature =
    paiements.filter(
      (transaction) =>
        transaction.candidatureId ===
        candidature.id,
    );

  const paiementConfirme =
    paiementsCandidature.some(
      (transaction) =>
        transaction.statut ===
          "confirmee" ||
        transaction.statut === "liberee",
    );

  const paiementEnAttente =
    !paiementConfirme &&
    paiementsCandidature.some(
      (transaction) =>
        transaction.statut === "en_attente",
    );

  const paiementAnnule =
    !paiementConfirme &&
    !paiementEnAttente &&
    paiementsCandidature.length > 0;

  // Les évaluations sont chargées par le backend avec la
  // livraison (relation "evaluations").
  const evaluationExistante =
    (livraison.evaluations?.length ?? 0) > 0;

  const evaluationEffectuee =
    evaluationExistante || evaluationEnvoyee;

  const livraisonValidee =
    statut === "validee";

  const projetTermine =
    livraisonValidee &&
    paiementConfirme &&
    evaluationEffectuee;

  // ==========================================================
  // ENVOI DE L'ÉVALUATION
  // POST /livraisons/:livraisonId/evaluation
  // Corps attendu par CreateEvaluationDto : { note, commentaire? }
  // ==========================================================

  async function envoyerEvaluation(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      evaluationEnvoi ||
      evaluationEnvoyee ||
      evaluationExistante
    ) {
      return;
    }

    if (note < 1) {
      setEvaluationErreur(
        "Veuillez choisir une note entre 1 et 5.",
      );
      return;
    }

    setEvaluationErreur(null);
    setEvaluationEnvoi(true);

    try {
      await api.post<Evaluation>(
        `/livraisons/${livraison.id}/evaluation`,
        {
          note,

          // commentaire facultatif : JSON.stringify retire
          // automatiquement la clé si elle vaut undefined.
          commentaire:
            commentaireEvaluation.trim() ||
            undefined,
        },
      );

      // Succès : on ferme le formulaire (via evaluationEnvoyee),
      // on affiche la confirmation, puis on rafraîchit les
      // données (livraison + évaluations + statut mission)
      // sans recharger toute la page.
      setEvaluationEnvoyee(true);

      await onRafraichir();
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi de l'évaluation :",
        error,
      );

      if (
        error instanceof ApiError
      ) {
        // 400 : paiement non confirmé / livraison non validée ;
        // 403 : mission n'appartenant pas au client ;
        // 409 : évaluation déjà effectuée ; autre : erreur serveur.
        // On affiche le message métier du backend.
        setEvaluationErreur(
          error.message ||
            "Impossible d'envoyer l'évaluation.",
        );
      } else {
        setEvaluationErreur(
          "Erreur réseau : impossible d'envoyer l'évaluation. Vérifiez votre connexion.",
        );
      }
    } finally {
      setEvaluationEnvoi(false);
    }
  }

  // ==========================================================
  // ACTION CLIENT
  // ==========================================================

  async function handleAction(
    actionType:
      | "valider"
      | "corriger",
  ) {
    if (envoi) {
      return;
    }

    if (
      actionType === "corriger" &&
      !commentaireCorrection.trim()
    ) {
      setErreur(
        "Veuillez indiquer les corrections à apporter.",
      );
      return;
    }

    setErreur(null);
    setEnvoi(true);
    setAction(actionType);

    try {
      if (
        actionType === "valider"
      ) {
        const resultat =
          await api.patch<Livraison>(
            `/livraisons/${livraison.id}/valider`,
          );

        setStatut(
          resultat.statut ??
            "validee",
        );
      } else {
        const resultat =
          await api.patch<Livraison>(
            `/livraisons/${livraison.id}/demander-correction`,
            {
              commentaireCorrection:
                commentaireCorrection.trim(),
            },
          );

        setStatut(
          resultat.statut ??
            "correction_demandee",
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'action sur la livraison :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : "Impossible de traiter la livraison.",
      );
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  }

  return (
    <NoticeCard>
      {/* EN-TÊTE */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Livraison reçue
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              "Mission"}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            Étudiant : {etudiantNom}
          </p>
        </div>

        {etudiantId && (
          <Link
            href={`/tableau-de-bord/messages?contact=${encodeURIComponent(
              etudiantId,
            )}&nom=${encodeURIComponent(
              etudiantNom,
            )}`}
          >
            <Button
              size="sm"
              variant="ghost"
              className="inline-flex items-center gap-2"
            >
              <MessageCircle
                size={16}
              />
              Discuter avec l&apos;étudiant
            </Button>
          </Link>
        )}
      </div>

      {/* STATUT */}

      <div className="mt-5 border-t border-ink/15 pt-5">
        <Tag
          tone={
            statut === "validee"
              ? "rice"
              : statut ===
                  "correction_demandee"
                ? "brique"
                : "ink"
          }
        >
          {statutLivraisonLabel[statut]}
        </Tag>
      </div>

      {/* LIVRABLE */}

      {livraison.lienLivrable && (
        <div className="mt-5">
          <a
            href={
              livraison.lienLivrable
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-sm text-ocre-dark hover:underline"
          >
            <ExternalLink size={15} />
            Ouvrir le livrable
          </a>
        </div>
      )}

      {livraison.piecesJointes && livraison.piecesJointes.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Fichiers livrés
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {livraison.piecesJointes.map((piece) => (
              <li key={piece.url}>
                <a
                  href={getFileUrl(piece.url) ?? piece.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-2 break-all text-ocre-dark hover:underline"
                >
                  <ExternalLink size={15} />
                  {piece.nom}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* COMMENTAIRE ÉTUDIANT */}

      {livraison.commentaireLivraison && (
        <div className="mt-5 rounded-lg border border-ink/10 bg-ink/5 p-4">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Commentaire de l&apos;étudiant
          </p>

          <p className="mt-2 text-sm text-ink">
            {
              livraison.commentaireLivraison
            }
          </p>
        </div>
      )}

      {/* COMMENTAIRE CORRECTION */}

      {statut ===
        "correction_demandee" &&
        livraison.commentaireCorrection && (
          <div className="mt-5 rounded-lg border border-brique/20 bg-brique/5 p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-brique">
              Correction demandée
            </p>

            <p className="mt-2 text-sm text-ink">
              {
                livraison.commentaireCorrection
              }
            </p>
          </div>
        )}

      {/* ACTIONS CLIENT */}

      {statut !== "validee" && (
        <div className="mt-6 border-t border-ink/15 pt-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            Actions
          </p>

          <div className="mt-4">
            <Field
              label="Commentaire de correction"
              htmlFor={`correction-${candidature.id}`}
            >
              <Textarea
                id={`correction-${candidature.id}`}
                rows={3}
                value={
                  commentaireCorrection
                }
                onChange={(event) =>
                  setCommentaireCorrection(
                    event.target.value,
                  )
                }
                placeholder="Indiquez les modifications à apporter…"
                disabled={envoi}
              />
            </Field>
          </div>

          {erreur && (
            <p className="mt-3 text-xs text-brique">
              {erreur}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {/* VALIDER */}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="inline-flex items-center gap-2 border border-rice/30 text-rice hover:bg-rice/10"
              onClick={() =>
                handleAction("valider")
              }
              disabled={envoi}
            >
              <CheckCircle size={16} />

              {envoi &&
              action === "valider"
                ? "Validation…"
                : "Valider la livraison"}
            </Button>

            {/* CORRECTION */}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="inline-flex items-center gap-2 border border-brique/30 text-brique hover:bg-brique/10"
              onClick={() =>
                handleAction("corriger")
              }
              disabled={
                envoi ||
                !commentaireCorrection.trim()
              }
            >
              <XCircle size={16} />

              {envoi &&
              action === "corriger"
                ? "Envoi…"
                : "Demander une correction"}
            </Button>
          </div>
        </div>
      )}

{/* =========================================================
          WORKFLOW DE FIN DE PROJET
          Livraison validée -> Paiement -> Évaluation -> Terminé
          ==================================================== */}

      {statut === "validee" && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            État du projet
          </p>

          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              Livraison validée
            </li>

            {!paiementConfirme &&
              (paiementEnAttente ? (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  Paiement déclaré — en attente de confirmation
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      Suivre le paiement
                    </Button>
                  </Link>
                </li>
              ) : paiementAnnule ? (
                <li className="flex flex-wrap items-center gap-2 text-brique">
                  <XCircle
                    size={16}
                    aria-hidden="true"
                  />
                  Paiement annulé — une nouvelle tentative est possible
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-brique/30 text-brique hover:bg-brique/10"
                    >
                      Refaire le paiement
                    </Button>
                  </Link>
                </li>
              ) : (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  Paiement obligatoire
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      Payer maintenant
                    </Button>
                  </Link>
                </li>
              ))}

            {paiementConfirme && (
              <li className="flex items-center gap-2 text-rice">
                <CheckCircle
                  size={16}
                  aria-hidden="true"
                />
                Paiement confirmé
              </li>
            )}

            {paiementConfirme &&
              (evaluationEffectuee ? (
                <li className="flex items-center gap-2 text-rice">
                  <CheckCircle
                    size={16}
                    aria-hidden="true"
                  />
                  Évaluation effectuée
                </li>
              ) : (
                <li className="flex items-center gap-2 text-ocre">
                  <Star
                    size={16}
                    aria-hidden="true"
                  />
                  Évaluation obligatoire
                </li>
              ))}
          </ul>

          {projetTermine && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rice/20 bg-rice/5 px-3 py-2 text-sm font-medium text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              Projet terminé
            </p>
          )}
        </div>
      )}

      {/* =========================================================
          ÉVALUATION OBLIGATOIRE
          Affichée uniquement si :
            - la livraison est validée ;
            - le paiement correspondant est confirmé ou libéré ;
            - aucune évaluation n'existe encore.
          Le backend (EvaluationsService.create) reste la
          protection principale : il refuse 400/403/409 sinon.
          ==================================================== */}

      {statut === "validee" &&
        paiementConfirme &&
        !evaluationEffectuee && (
          <form
            onSubmit={
              envoyerEvaluation
            }
            className="mt-5 border-t border-ink/15 pt-5"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
              Évaluer la livraison
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              Votre évaluation est obligatoire pour
              marquer le projet comme terminé.
            </p>

            <div
              className="mt-4 flex items-center gap-1"
              role="radiogroup"
              aria-label="Note de 1 à 5"
            >
              {[1, 2, 3, 4, 5].map(
                (valeur) => (
                  <button
                    key={valeur}
                    type="button"
                    role="radio"
                    aria-checked={
                      note === valeur
                    }
                    aria-label={`Note ${valeur} sur 5`}
                    disabled={
                      evaluationEnvoi
                    }
                    onClick={() =>
                      setNote(valeur)
                    }
                    className="rounded p-1 transition-colors hover:bg-ocre/10 disabled:opacity-50"
                  >
                    <Star
                      size={22}
                      aria-hidden="true"
                      className={
                        valeur <= note
                          ? "fill-ocre-dark text-ocre-dark"
                          : "text-ink/30"
                      }
                    />
                  </button>
                ),
              )}

              {note > 0 && (
                <span className="ml-2 font-mono text-sm text-ocre-dark">
                  {note}/5
                </span>
              )}
            </div>

            <div className="mt-4 max-w-xl">
              <Field
                label="Commentaire (facultatif)"
                htmlFor={`evaluation-${candidature.id}`}
              >
                <Textarea
                  id={`evaluation-${candidature.id}`}
                  rows={3}
                  value={
                    commentaireEvaluation
                  }
                  onChange={(event) =>
                    setCommentaireEvaluation(
                      event.target.value,
                    )
                  }
                  placeholder="Partagez votre retour sur le travail réalisé…"
                  disabled={
                    evaluationEnvoi
                  }
                />
              </Field>
            </div>

            {evaluationErreur && (
              <p className="mt-3 text-xs text-brique">
                {evaluationErreur}
              </p>
            )}

            <Button
              type="submit"
              size="sm"
              className="mt-4"
              disabled={
                evaluationEnvoi || note < 1
              }
            >
              {evaluationEnvoi
                ? "Envoi…"
                : "Envoyer l'évaluation"}
            </Button>
          </form>
        )}

      {/* ÉVALUATION ENVOYÉE */}

      {evaluationEnvoyee && (
        <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
          <p className="text-sm text-rice">
            Évaluation envoyée. Merci pour
            votre retour !
          </p>
        </div>
      )}
    </NoticeCard>
  );
}
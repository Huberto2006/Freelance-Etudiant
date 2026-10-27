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
import { useTranslations } from "next-intl";
import { useFormats } from "@/i18n/use-formats";
import { useLabels } from "@/i18n/use-labels";
import { useOptionLabels } from "@/i18n/use-option-labels";

import { api, ApiError, lienExterneSur } from "@/lib/api";
import { PieceJointeAffichage } from "@/components/ui/PieceJointe";
import { useAuth } from "@/lib/auth-context";

import type {
  Candidature,
  Evaluation,
  Livraison,
  PieceJointeLivraison,
  Transaction,
} from "@/lib/types";



import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
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
  const t = useTranslations("deliveriesPage");
  return (
    <Suspense
      fallback={
        <div>
          <p className="text-sm text-ink-soft">
            {t("loading")}
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
  const t = useTranslations("deliveriesPage");
  const { argent: formatArgent, dateCourte: formatDateCourte } = useFormats();
  const { statutLivraison: libelleStatutLivraison } = useLabels();
  const { categorie: libelleCategorie } = useOptionLabels();
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
          paiementsData,
        ] = await Promise.all([
          api.get<Candidature[]>(
            "/candidatures/me",
          ),

          api.get<Livraison[]>(
            "/livraisons/me",
          ),

          // Paiements reçus (RG-066) : l'étudiant a besoin de
          // savoir si le paiement de la mission est confirmé
          // pour savoir quand il peut évaluer son client.
          // Un échec ne doit pas masquer les livraisons.
          api
            .get<Transaction[]>(
              "/paiements/recus",
            )
            .catch(
              () => [] as Transaction[],
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

        setPaiements(paiementsData);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des livraisons :",
          error,
        );

        if (!cancelled) {
          setErreur(
            error instanceof ApiError
              ? error.message
              : t("loadError"),
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
    t,
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
        nom: candidature.etudiant?.utilisateur?.nom ?? t("student"),
        photoUrl: candidature.etudiant?.utilisateur?.photoUrl ?? null,
        label: t("student"),
      };
    }
    return {
      nom:
        candidature.mission?.client?.utilisateur?.nom ??
        candidature.mission?.client?.nomEntreprise ??
        t("client"),
      photoUrl: candidature.mission?.client?.utilisateur?.photoUrl ?? null,
      label: t("client"),
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
          {t("checkingSession")}
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
            {t("mustLogin")}
          </p>

          <Link
            href="/connexion"
            className="mt-4 inline-block"
          >
            <Button
              size="sm"
              variant="secondary"
            >
              {t("login")}
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
            {t("notAllowed")}
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
            aria-label={t("breadcrumb")}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            <Link
              href="/tableau-de-bord/livraisons"
              className="hover:text-ink hover:underline"
            >
              {t("breadcrumbDeliveries")}
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-ink">{t("detail")}</span>
          </nav>

          <BoutonRetour
            label={t("back")}
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
                    {t("noneSubmitted")}
                  </p>
                </NoticeCard>
              )
            ) : (
              <LivraisonEtudiant
                key={candidatureSelectionnee.id}
                candidature={candidatureSelectionnee}
                livraison={livraisonSelectionnee}
                paiements={paiements}
                onRafraichir={rafraichirDonnees}
              />
            )}
          </div>

          {/* PANNEAU LATÉRAL — DÉTAILS DE LA MISSION */}

          <div className="flex flex-col gap-5">
            <NoticeCard>
              <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                {t("missionDetails")}
              </p>

              <Link
                href={`/missions/${candidatureSelectionnee.missionId}`}
                className="mt-3 block"
              >
                <Button size="sm" variant="ghost" className="w-full">
                  {t("viewMission")}
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
                    {t("deliveryIn", {
                      count: candidatureSelectionnee.delaiPropose,
                    })}
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
                    {t("deliveryStatus")}
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
                    {libelleStatutLivraison(livraisonSelectionnee.statut)}
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
            ? t("clientSpace")
            : t("studentSpace")
        }
        title={
          role === "client"
            ? t("receivedDeliveries")
            : t("myDeliveries")
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
              label={t("toProcess")}
              value={compteLivraisons.a_traiter}
              sublabel={t("deliveriesToSend")}
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
              label={t("correctionsRequested")}
              value={compteLivraisons.corrections}
              sublabel={t("toRedo")}
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
              label={t("awaitingValidation")}
              value={compteLivraisons.attente_validation}
              sublabel={t("atClient")}
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
              label={t("validatedDeliveries")}
              value={compteLivraisons.validees}
              sublabel={t("completed")}
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
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              className="pl-9 text-sm sm:text-base"
            />
          </div>
          <Select value={filtreClient} onChange={(event) => setFiltreClient(event.target.value)} aria-label={t("filterClient")}>
            <option value="" disabled hidden>{t("allClients")}</option>
            {Array.from(new Set(candidaturesFiltrees.map((c) => c.mission?.client?.utilisateur?.nom ?? c.mission?.client?.nomEntreprise ?? t("client")))).map((client) => <option key={client} value={client}>{client}</option>)}
          </Select>
          <Select value={filtreMission} onChange={(event) => setFiltreMission(event.target.value)} aria-label={t("filterMission")}>
            <option value="" disabled hidden>{t("allMissions")}</option>
            {Array.from(new Set(candidaturesFiltrees.map((c) => c.mission?.titre ?? t("mission")))).map((mission) => <option key={mission} value={mission}>{mission}</option>)}
          </Select>
          <Select value={filtreStatut} onChange={(event) => setFiltreStatut(event.target.value)} aria-label={t("filterStatus")}>
            <option value="" disabled hidden>{t("allStatuses")}</option>
            {["en_attente", "validee", "correction_demandee"].map((valeur) => <option key={valeur} value={valeur}>{libelleStatutLivraison(valeur)}</option>)}
          </Select>
          <Select value={filtreMethode} onChange={(event) => setFiltreMethode(event.target.value)} aria-label={t("filterMethod")}>
            <option value="" disabled hidden>{t("allMethods")}</option>
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
            <option value="fichiers">{t("files")}</option>
          </Select>
        </div>
      )}

      {/* ========================================================
          CHARGEMENT DES DONNÉES
          ======================================================== */}

      {chargement ? (
        <p className="text-sm text-ink-soft">
          {t("loadingDeliveries")}
        </p>
      ) : candidaturesFiltrees.length ===
        0 ? (
        <NoticeCard>
          <p className="text-sm text-ink-soft">
            {role === "client"
              ? t("emptyClient")
              : t("emptyStudent")}
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
                ? t("viewMyMissions")
                : t("viewMyApplications")}
            </Button>
          </Link>
        </NoticeCard>
      ) : (
        <>
          <SousNavigation
            onglets={[
              {
                valeur: "toutes",
                label: t("all"),
                compte: candidaturesFiltrees.length,
              },
              {
                valeur: "a_traiter",
                label: t("toProcess"),
                compte: compteLivraisons.a_traiter,
              },
              {
                valeur: "corrections",
                label: t("correctionsRequested"),
                compte: compteLivraisons.corrections,
              },
              {
                valeur: "attente_validation",
                label: t("awaitingValidation"),
                compte: compteLivraisons.attente_validation,
              },
              {
                valeur: "validees",
                label: t("validated"),
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
                  {t("noneInCategory")}
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
                        {candidature.mission?.titre ?? t("mission")}
                      </p>
                      {candidature.mission?.categorie && (
                        <Tag tone="ink">{libelleCategorie(candidature.mission.categorie)}</Tag>
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
                              ? t("filesCount", { count: livraison?.piecesJointes?.length ?? 0 })
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
                        {livraison ? libelleStatutLivraison(livraison.statut) : t("noDelivery")}
                      </Tag>
                    </div>
                  </div>

                  <Link
                    href={`/tableau-de-bord/livraisons?candidature=${encodeURIComponent(candidature.id)}`}
                    className="shrink-0"
                  >
                    <Button size="sm" variant="ghost">
                      {t("see")}
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
  paiements,
  onRafraichir,
}: {
  candidature: Candidature;
  livraison: Livraison | null;
  paiements: Transaction[];
  onRafraichir: () => Promise<void>;
}) {
  const { utilisateur } = useAuth();
  const t = useTranslations("deliveriesPage");
  const { statutLivraison: libelleStatutLivraison } = useLabels();

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
    t("client");

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
    if (etape === 1) {
      setErreur(null);
      setEtape(2);
      return;
    }

    if (etape !== 2) return;

    const lien = lienLivrable.trim();
    if (methode === "depot" && !lien) {
      setErreur(t("errLinkRequired"));
      return;
    }
    if (methode === "fichiers" && !piecesJointes.length) {
      setErreur(t("errFileBeforeContinue"));
      return;
    }

    setErreur(null);
    setEtape(3);
  }

  function etapePrecedente() {
    setErreur(null);
    if (etape === 3) {
      setEtape(2);
    } else if (etape === 2) {
      setEtape(1);
    }
  }

  // ==========================================================
  // ÉVALUATION DU CLIENT (RG-066)
  // ==========================================================

  const [noteEvalClient, setNoteEvalClient] = useState(0);
  const [commentaireEvalClient, setCommentaireEvalClient] = useState("");
  const [envoiEvalClient, setEnvoiEvalClient] = useState(false);
  const [erreurEvalClient, setErreurEvalClient] = useState<string | null>(null);
  const [evalClientEnvoyee, setEvalClientEnvoyee] = useState(false);
  const [editionEvalClient, setEditionEvalClient] = useState(false);

  const paiementConfirme = paiements.some(
    (transaction) =>
      transaction.candidatureId === candidature.id &&
      (transaction.statut === "confirmee" ||
        transaction.statut === "liberee"),
  );

  const maEvaluationClient =
    livraison?.evaluations?.find(
      (evaluation) => evaluation.evaluateurId === utilisateur?.id,
    ) ?? null;

  async function envoyerEvalClient(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!livraison) return;
    if (envoiEvalClient || evalClientEnvoyee || maEvaluationClient) return;

    if (noteEvalClient < 1) {
      setErreurEvalClient(t("errRating"));
      return;
    }

    setErreurEvalClient(null);
    setEnvoiEvalClient(true);

    try {
      await api.post<Evaluation>(
        `/livraisons/${livraison.id}/evaluation-client`,
        {
          note: noteEvalClient,
          commentaire: commentaireEvalClient.trim() || undefined,
        },
      );

      setEvalClientEnvoyee(true);
      await onRafraichir();
    } catch (error) {
      setErreurEvalClient(
        error instanceof ApiError
          ? error.message || t("errSendReview")
          : t("errSendReviewNetwork"),
      );
    } finally {
      setEnvoiEvalClient(false);
    }
  }

  async function enregistrerEvalClient() {
    if (!maEvaluationClient || noteEvalClient < 1) return;

    setEnvoiEvalClient(true);
    setErreurEvalClient(null);
    try {
      await api.patch<Evaluation>(`/evaluations/${maEvaluationClient.id}`, {
        note: noteEvalClient,
        commentaire: commentaireEvalClient.trim() || undefined,
      });
      setEditionEvalClient(false);
      await onRafraichir();
    } catch (error) {
      setErreurEvalClient(
        error instanceof ApiError
          ? error.message
          : t("errEditReview"),
      );
    } finally {
      setEnvoiEvalClient(false);
    }
  }

  async function ajouterFichiers(files: FileList | File[]) {
    const selections = Array.from(files);
    if (!selections.length) return;
    if (piecesJointes.length + selections.length > 10) {
      setErreur(t("errMaxFiles"));
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
          : t("errAddFile"),
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
      setErreur(t("errLinkRequired"));
      return;
    }
    if (methode === "fichiers" && !piecesJointes.length) {
      setErreur(t("errFileBeforeSend"));
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
          : t("errSendDelivery"),
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
            {t("delivery")}
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              t("mission")}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            {t("clientName", { nom: clientNom })}
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
              {t("chatWithClient")}
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
            {libelleStatutLivraison(livraison.statut)}
          </Tag>
        </div>
      )}

      {/* CORRECTION */}

      {livraison?.statut ===
        "correction_demandee" &&
        livraison.commentaireCorrection && (
          <div className="mt-5 rounded-lg border border-brique/20 bg-brique/5 p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-brique">
              {t("correctionRequested")}
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
            {t("validatedByClient")}
          </p>
        </div>
      )}

      {/* LIEN */}

      {livraison?.lienLivrable && (
        <div className="mt-5">
          <a
            href={
              lienExterneSur(livraison.lienLivrable) ?? "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-sm text-ocre-dark hover:underline"
          >
            <ExternalLink size={15} />
            {t("openDeliverable")}
          </a>
        </div>
      )}

      {/* FORMULAIRE — présenté en 3 étapes : méthode, informations, aperçu */}

      {livraison?.statut !==
        "validee" && (
        <div className="mt-6 max-w-xl border-t border-ink/15 pt-6">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {livraison
              ? t("editMyDelivery")
              : t("submitMyDelivery")}
          </p>

          {/* INDICATEUR D'ÉTAPES */}

          <div className="mt-4 flex items-center">
            {(
              [
                { numero: 1, label: t("stepMethod") },
                { numero: 2, label: t("stepInfo") },
                { numero: 3, label: t("stepPreview") },
              ] as const
            ).map((item, index) => (
              <div
                key={item.numero}
                className={`flex items-center ${index < 2 ? "flex-1" : ""}`}
              >
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
                    className={`text-[10px] leading-tight sm:text-xs ${etape === item.numero ? "font-medium text-ink" : "text-ink-soft"}`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <span className="mx-1.5 h-px flex-1 bg-ink/15 sm:mx-2" aria-hidden="true" />
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
                  <span className="font-medium">{t("repoLink")}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{t("githubOrGitlab")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethode("fichiers")}
                  className={`relative border p-3 text-left text-sm ${methode === "fichiers" ? "border-ocre-dark bg-ocre/10" : "border-ink/20"}`}
                >
                  {methode === "fichiers" && (
                    <Check size={14} className="absolute right-3 top-3 text-ocre-dark" aria-hidden="true" />
                  )}
                  <span className="font-medium">{t("files")}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{t("upTo10")}</span>
                </button>
              </div>
            )}

            {/* ÉTAPE 2 : INFORMATIONS */}

            {etape === 2 &&
              (methode === "depot" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("platform")} htmlFor={`plateforme-${candidature.id}`}>
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
                  <Field label={t("branchOptional")} htmlFor={`branche-${candidature.id}`}>
                    <Input
                      id={`branche-${candidature.id}`}
                      value={branche}
                      onChange={(event) => setBranche(event.target.value)}
                      placeholder="main"
                      disabled={envoi}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={t("repoUrl")} htmlFor={`lien-${candidature.id}`}>
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
                    <Field label={t("comment")} htmlFor={`commentaire-${candidature.id}`}>
                      <Textarea
                        id={`commentaire-${candidature.id}`}
                        rows={4}
                        value={commentaireLivraison}
                        onChange={(event) => setCommentaireLivraison(event.target.value)}
                        placeholder={t("deliveryNotesPlaceholder")}
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
                    <span>{uploadEnCours ? t("uploadingFiles") : t("selectOrDrop")}</span>
                    <span className="text-xs text-ink-soft">{t("fileTypes")}</span>
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
                          <span className="min-w-0 truncate">{piece.nom} <span className="text-xs text-ink-soft">({t("sizeKb", { taille: Math.ceil((piece.tailleOctets ?? 0) / 1024) })})</span></span>
                          <button type="button" onClick={() => setPiecesJointes((precedentes) => precedentes.filter((_, pieceIndex) => pieceIndex !== index))} aria-label={t("removeFile", { nom: piece.nom })} className="shrink-0 text-brique">
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4">
                    <Field label={t("comment")} htmlFor={`commentaire-${candidature.id}`}>
                      <Textarea
                        id={`commentaire-${candidature.id}`}
                        rows={4}
                        value={commentaireLivraison}
                        onChange={(event) => setCommentaireLivraison(event.target.value)}
                        placeholder={t("deliveryNotesPlaceholder")}
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
                  <span className="text-ink-soft">{t("methodLabel")} </span>
                  {methode === "depot"
                    ? t("repoLinkWith", { plateforme: plateforme === "github" ? "GitHub" : "GitLab" })
                    : t("files")}
                </p>

                {methode === "depot" ? (
                  <>
                    <p className="break-all">
                      <span className="text-ink-soft">{t("urlLabel")} </span>
                      {lienLivrable || "—"}
                    </p>
                    {branche && (
                      <p>
                        <span className="text-ink-soft">{t("branchLabel")} </span>
                        {branche}
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    <span className="text-ink-soft">{t("filesLabel")} </span>
                    {t("filesCount", { count: piecesJointes.length })}
                  </p>
                )}

                {commentaireLivraison && (
                  <p>
                    <span className="text-ink-soft">{t("commentLabel")} </span>
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
                {t("previous")}
              </Button>

              {etape < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={etapeSuivante}
                  disabled={envoi || uploadEnCours}
                >
                  {t("next")}
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
                    ? t("sending")
                    : livraison
                      ? t("updateDelivery")
                      : t("submitMyDelivery")}
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          ÉVALUATION DU CLIENT (RG-066)
          L'étudiant évalue le client après livraison validée et
          paiement confirmé/libéré. Une seule évaluation par auteur
          et par livraison (unicité livraison_id + evaluateur_id
          côté backend). Le backend reste la protection principale.
          ==================================================== */}

      {livraison &&
        livraison.statut === "validee" &&
        paiementConfirme && (
          <>
            {maEvaluationClient ? (
              <div className="mt-5 rounded-lg border border-ink/10 bg-ink/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {t("yourClientReview", { note: maEvaluationClient.note })}
                  </p>
                  {!editionEvalClient && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNoteEvalClient(maEvaluationClient.note);
                        setCommentaireEvalClient(
                          maEvaluationClient.commentaire ?? "",
                        );
                        setEditionEvalClient(true);
                      }}
                    >
                      {t("edit")}
                    </Button>
                  )}
                </div>

                {editionEvalClient && (
                  <div className="mt-4 max-w-xl">
                    <Field
                      label={t("rating")}
                      htmlFor={`evaluation-client-modification-${candidature.id}`}
                    >
                      <Input
                        id={`evaluation-client-modification-${candidature.id}`}
                        type="number"
                        min={1}
                        max={5}
                        value={noteEvalClient}
                        onChange={(event) =>
                          setNoteEvalClient(Number(event.target.value))
                        }
                      />
                    </Field>
                    <Field
                      label={t("commentOptional")}
                      htmlFor={`evaluation-client-commentaire-${candidature.id}`}
                    >
                      <Textarea
                        id={`evaluation-client-commentaire-${candidature.id}`}
                        rows={3}
                        value={commentaireEvalClient}
                        onChange={(event) =>
                          setCommentaireEvalClient(event.target.value)
                        }
                      />
                    </Field>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        disabled={envoiEvalClient || noteEvalClient < 1}
                        onClick={() => void enregistrerEvalClient()}
                      >
                        {t("save")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditionEvalClient(false)}
                      >
                        {t("close")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !evalClientEnvoyee && (
                <form
                  onSubmit={envoyerEvalClient}
                  className="mt-5 border-t border-ink/15 pt-5"
                >
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                    {t("reviewClient")}
                  </p>

                  <p className="mt-1 text-sm text-ink-soft">
                    {t("reviewClientHint")}
                  </p>

                  <div className="mt-4 max-w-xl">
                    <Field
                      label={t("rating")}
                      htmlFor={`evaluation-client-note-${candidature.id}`}
                    >
                      <Input
                        id={`evaluation-client-note-${candidature.id}`}
                        type="number"
                        min={1}
                        max={5}
                        value={noteEvalClient}
                        onChange={(event) =>
                          setNoteEvalClient(Number(event.target.value))
                        }
                        disabled={envoiEvalClient}
                      />
                    </Field>
                    <Field
                      label={t("commentOptional")}
                      htmlFor={`evaluation-client-avis-${candidature.id}`}
                    >
                      <Textarea
                        id={`evaluation-client-avis-${candidature.id}`}
                        rows={3}
                        value={commentaireEvalClient}
                        onChange={(event) =>
                          setCommentaireEvalClient(event.target.value)
                        }
                        placeholder={t("feedbackPlaceholder")}
                        disabled={envoiEvalClient}
                      />
                    </Field>

                    {erreurEvalClient && (
                      <p className="mt-3 text-xs text-brique">
                        {erreurEvalClient}
                      </p>
                    )}

                    <Button
                      type="submit"
                      size="sm"
                      className="mt-4"
                      disabled={envoiEvalClient || noteEvalClient < 1}
                    >
                      {envoiEvalClient
                        ? t("sending")
                        : t("sendMyReview")}
                    </Button>
                  </div>
                </form>
              )
            )}

            {evalClientEnvoyee && (
              <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
                <p className="text-sm text-rice">
                  {t("reviewSent")}
                </p>
              </div>
            )}
          </>
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
  const t = useTranslations("deliveriesPage");
  const { statutLivraison: libelleStatutLivraison } = useLabels();
  const etudiantId =
    candidature.etudiant
      ?.utilisateur?.id ??
    undefined;

  const etudiantNom =
    candidature.etudiant
      ?.utilisateur?.nom ??
    t("student");

  // ==========================================================
  // ÉVALUATIONS (RG-037 / RG-065 / RG-066)
  // Une livraison peut désormais porter deux évaluations
  // (client -> étudiant ET étudiant -> client). Chaque partie
  // ne doit voir et gérer QUE la sienne : on filtre par
  // evaluateurId. Le backend garantit l'unicité par
  // (livraison_id, evaluateur_id).
  // ==========================================================
  const { utilisateur } = useAuth();

  const maEvaluation =
    livraison.evaluations?.find(
      (evaluation) =>
        evaluation.evaluateurId ===
        utilisateur?.id,
    ) ?? null;

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

  const toast = useToast();

  // La validation est irréversible côté backend (statut « validée ») et
  // peut libérer un paiement : elle exige une confirmation explicite.
  const [confirmerValidation, setConfirmerValidation] =
    useState(false);

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
  const [editionEvaluation, setEditionEvaluation] = useState(false);

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
  // livraison (relation "evaluations"). Seule MA propre
  // évaluation (client -> étudiant) compte ici.
  const evaluationExistante =
    Boolean(maEvaluation);

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
      setEvaluationErreur(t("errRating"));
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
            t("errSendReview"),
        );
      } else {
        setEvaluationErreur(
          t("errSendReviewNetworkCheck"),
        );
      }
    } finally {
      setEvaluationEnvoi(false);
    }
  }

  async function enregistrerEvaluation() {
    if (!maEvaluation || note < 1) return;

    setEvaluationEnvoi(true);
    setEvaluationErreur(null);
    try {
      await api.patch<Evaluation>(`/evaluations/${maEvaluation.id}`, {
        note,
        commentaire: commentaireEvaluation.trim() || undefined,
      });
      setEditionEvaluation(false);
      await onRafraichir();
    } catch (error) {
      setEvaluationErreur(
        error instanceof ApiError
          ? error.message
          : t("errEditReview"),
      );
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
      setErreur(t("errCorrectionsRequired"));
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
        toast.succes(t("validatedToast"));
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
        toast.succes(t("correctionSentToast"));
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'action sur la livraison :",
        error,
      );

      setErreur(
        error instanceof ApiError
          ? error.message
          : t("errProcessDelivery"),
      );
    } finally {
      setEnvoi(false);
      setAction(null);
      setConfirmerValidation(false);
    }
  }

  return (
    <NoticeCard>
      {/* EN-TÊTE */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("deliveryReceived")}
          </p>

          <h2 className="mt-2 font-display text-xl font-medium">
            {candidature.mission?.titre ??
              t("mission")}
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            {t("studentName", { nom: etudiantNom })}
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
              {t("chatWithStudent")}
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
          {libelleStatutLivraison(statut)}
        </Tag>
      </div>

      {/* LIVRABLE */}

      {livraison.lienLivrable && (
        <div className="mt-5">
          <a
            href={
              lienExterneSur(livraison.lienLivrable) ?? "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 break-all text-sm text-ocre-dark hover:underline"
          >
            <ExternalLink size={15} />
            {t("openDeliverable")}
          </a>
        </div>
      )}

      {livraison.piecesJointes && livraison.piecesJointes.length > 0 && (
        <div className="mt-5">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("deliveredFiles")}
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {livraison.piecesJointes.map((piece) => (
              <li key={piece.url}>
                <PieceJointeAffichage url={piece.url} nom={piece.nom} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* COMMENTAIRE ÉTUDIANT */}

      {livraison.commentaireLivraison && (
        <div className="mt-5 rounded-lg border border-ink/10 bg-ink/5 p-4">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("studentComment")}
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
              {t("correctionRequested")}
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
            {t("actions")}
          </p>

          <div className="mt-4">
            <Field
              label={t("correctionComment")}
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
                placeholder={t("correctionPlaceholder")}
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
                setConfirmerValidation(true)
              }
              disabled={envoi}
            >
              <CheckCircle size={16} />

              {envoi &&
              action === "valider"
                ? t("validating")
                : t("validateDelivery")}
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
                ? t("sending")
                : t("requestCorrection")}
            </Button>
          </div>

          <ConfirmDialog
            ouvert={confirmerValidation}
            titre={t("confirmValidateTitle")}
            description={t("confirmValidateDescription")}
            libelleConfirmer={t("confirmValidateAction")}
            destructif={false}
            enCours={envoi && action === "valider"}
            onConfirmer={() => void handleAction("valider")}
            onAnnuler={() => setConfirmerValidation(false)}
          />
        </div>
      )}

{/* =========================================================
          WORKFLOW DE FIN DE PROJET
          Livraison validée -> Paiement -> Évaluation -> Terminé
          ==================================================== */}

      {statut === "validee" && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
            {t("projectStatus")}
          </p>

          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              {t("deliveryValidated")}
            </li>

            {!paiementConfirme &&
              (paiementEnAttente ? (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  {t("paymentDeclared")}
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      {t("trackPayment")}
                    </Button>
                  </Link>
                </li>
              ) : paiementAnnule ? (
                <li className="flex flex-wrap items-center gap-2 text-brique">
                  <XCircle
                    size={16}
                    aria-hidden="true"
                  />
                  {t("paymentCancelled")}
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-brique/30 text-brique hover:bg-brique/10"
                    >
                      {t("retryPayment")}
                    </Button>
                  </Link>
                </li>
              ) : (
                <li className="flex flex-wrap items-center gap-2 text-ocre">
                  <Clock
                    size={16}
                    aria-hidden="true"
                  />
                  {t("paymentRequired")}
                  <Link href="/tableau-de-bord/paiements">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border border-ocre/30 text-ocre hover:bg-ocre/10"
                    >
                      {t("payNow")}
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
                {t("paymentConfirmed")}
              </li>
            )}

            {paiementConfirme &&
              (evaluationEffectuee ? (
                <li className="flex items-center gap-2 text-rice">
                  <CheckCircle
                    size={16}
                    aria-hidden="true"
                  />
                  {t("reviewDone")}
                </li>
              ) : (
                <li className="flex items-center gap-2 text-ocre">
                  <Star
                    size={16}
                    aria-hidden="true"
                  />
                  {t("reviewRequired")}
                </li>
              ))}
          </ul>

          {projetTermine && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rice/20 bg-rice/5 px-3 py-2 text-sm font-medium text-rice">
              <CheckCircle
                size={16}
                aria-hidden="true"
              />
              {t("projectCompleted")}
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
              {t("reviewDelivery")}
            </p>

            <p className="mt-1 text-sm text-ink-soft">
              {t("reviewMandatory")}
            </p>

            <div
              className="mt-4 flex items-center gap-1"
              role="radiogroup"
              aria-label={t("ratingGroup")}
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
                    aria-label={t("ratingOutOf", { valeur })}
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
                label={t("commentOptional")}
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
                  placeholder={t("workFeedbackPlaceholder")}
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
                ? t("sending")
                : t("sendReview")}
            </Button>
          </form>
        )}

      {/* =========================================================
          VOTRE ÉVALUATION (RG-065)
          Affichée une fois envoyée : consultation + modification
          de SA propre évaluation uniquement (maEvaluation est
          filtrée par evaluateurId).
          ==================================================== */}

      {maEvaluation && (
        <div className="mt-5 rounded-lg border border-ink/10 bg-ink/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {t("yourReview", { note: maEvaluation.note })}
            </p>
            {!editionEvaluation && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNote(maEvaluation.note);
                  setCommentaireEvaluation(
                    maEvaluation.commentaire ?? "",
                  );
                  setEditionEvaluation(true);
                }}
              >
                {t("edit")}
                    </Button>
            )}
          </div>

          {editionEvaluation && (
            <div className="mt-4 max-w-xl">
              <Field
                label={t("rating")}
                htmlFor={`evaluation-modification-${candidature.id}`}
              >
                <Input
                  id={`evaluation-modification-${candidature.id}`}
                  type="number"
                  min={1}
                  max={5}
                  value={note}
                  onChange={(event) => setNote(Number(event.target.value))}
                />
              </Field>
              <Field
                label={t("commentOptional")}
                htmlFor={`evaluation-commentaire-${candidature.id}`}
              >
                <Textarea
                  id={`evaluation-commentaire-${candidature.id}`}
                  rows={3}
                  value={commentaireEvaluation}
                  onChange={(event) => setCommentaireEvaluation(event.target.value)}
                />
              </Field>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={evaluationEnvoi || note < 1}
                  onClick={() => void enregistrerEvaluation()}
                >
                  {t("save")}
                      </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditionEvaluation(false)}
                >
                  {t("close")}
                      </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ÉVALUATION ENVOYÉE */}

      {evaluationEnvoyee && (
        <div className="mt-5 rounded-lg border border-rice/20 bg-rice/5 p-4">
          <p className="text-sm text-rice">
            {t("reviewSent")}
          </p>
        </div>
      )}
    </NoticeCard>
  );
}
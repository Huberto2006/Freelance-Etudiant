"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Check,
    Loader2,
    MessageCircle,
    MoreHorizontal,
    Search,
    UserPlus,
    Users,
    X,
} from "lucide-react";

import {
    accepterDemandeAmitie,
    chargerRelationsAmitie,
    envoyerDemandeAmitie,
    listerAmis,
    listerDemandesEnvoyees,
    listerDemandesRecues,
    lienConversation,
    nomProfilAmitie,
    refuserDemandeAmitie,
    relationAvec,
    retirerAmitie,
    sousTitreProfilAmitie,
    type DemandeAmitie,
    type ProfilAmitie,
    type RelationAvec,
    type RelationAmitie,
    type RelationsAmitie,
} from "@/lib/amitie";
import { api, ApiError } from "@/lib/api";
import type { EtudiantProfile } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

type Onglet = "amis" | "recues" | "envoyees" | "decouvrir";

/* ==========================================================
   AVATAR PROFIL AMITIÉ
   ========================================================== */

function Avatar({
    profil,
    taille = "md",
}: {
    profil: ProfilAmitie | null | undefined;
    taille?: "sm" | "md" | "lg";
}) {
    const nom = nomProfilAmitie(profil);

    const dimensions = {
        sm: "h-10 w-10 text-sm",
        md: "h-12 w-12 text-base",
        lg: "h-14 w-14 text-lg",
    };

    const classe = dimensions[taille];

    if (profil?.photoUrl) {
        return (
            <Image
                src={profil.photoUrl}
                alt={nom}
                width={56}
                height={56}
                unoptimized
                className={`${classe} shrink-0 rounded-full object-cover ring-1 ring-ink/15`}
            />
        );
    }

    return (
        <div
            className={`${classe} flex shrink-0 items-center justify-center rounded-full bg-ink/5 font-semibold text-ink-soft ring-1 ring-ink/15`}
            aria-hidden="true"
        >
            {nom.charAt(0).toUpperCase()}
        </div>
    );
}

/* ==========================================================
   AVATAR ÉTUDIANT
   ========================================================== */

function AvatarEtudiant({
    etudiant,
    taille = "md",
}: {
    etudiant: EtudiantProfile;
    taille?: "sm" | "md" | "lg";
}) {
    const nom = etudiant.utilisateur?.nom ?? "Étudiant";

    const dimensions = {
        sm: "h-10 w-10 text-sm",
        md: "h-12 w-12 text-base",
        lg: "h-14 w-14 text-lg",
    };

    const classe = dimensions[taille];

    if (etudiant.utilisateur?.photoUrl) {
        return (
            <Image
                src={etudiant.utilisateur.photoUrl}
                alt={nom}
                width={56}
                height={56}
                unoptimized
                className={`${classe} shrink-0 rounded-full object-cover ring-1 ring-ink/15`}
            />
        );
    }

    return (
        <div
            className={`${classe} flex shrink-0 items-center justify-center rounded-full bg-ink/5 font-semibold text-ink-soft ring-1 ring-ink/15`}
            aria-hidden="true"
        >
            {nom.charAt(0).toUpperCase()}
        </div>
    );
}

/* ==========================================================
   ÉTAT VIDE
   ========================================================== */

function EtatVide({
    icon,
    titre,
    description,
    action,
}: {
    icon: React.ReactNode;
    titre: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-ink/15 bg-paper-light px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
                {icon}
            </div>

            <h3 className="text-base font-semibold text-ink">
                {titre}
            </h3>

            <p className="mt-1 max-w-md text-sm leading-6 text-ink-soft">
                {description}
            </p>

            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}

/* ==========================================================
   ONGLET
   ========================================================== */

function OngletButton({
    actif,
    onClick,
    children,
    compteur,
}: {
    actif: boolean;
    onClick: () => void;
    children: React.ReactNode;
    compteur?: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5",
                "font-mono text-[11px] uppercase tracking-wider transition-colors",
                actif
                    ? "border-ink bg-ink text-paper-light"
                    : "border-ink/20 bg-paper text-ink-soft hover:border-ink/50 hover:text-ink",
            ].join(" ")}
        >
            {children}

            {typeof compteur === "number" && compteur > 0 ? (
                <span
                    className={[
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-px text-[10px] leading-none",
                        actif
                            ? "bg-paper-light/20 text-paper-light"
                            : "bg-ink/10 text-ink-soft",
                    ].join(" ")}
                >
                    {compteur}
                </span>
            ) : null}
        </button>
    );
}

/* ==========================================================
   MENU RETRAIT
   ========================================================== */

function MenuRetrait({
    ouvert,
    onToggle,
    onRetirer,
    chargement,
}: {
    ouvert: boolean;
    onToggle: () => void;
    onRetirer: () => void;
    chargement: boolean;
}) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onToggle}
                disabled={chargement}
                aria-label="Options de la relation"
                aria-expanded={ouvert}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
                <MoreHorizontal className="h-5 w-5" />
            </button>

            {ouvert ? (
                <div className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-ink/15 bg-paper-light p-1 shadow-lg">
                    <button
                        type="button"
                        onClick={onRetirer}
                        disabled={chargement}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-soft transition hover:bg-ink/5 hover:text-brique disabled:opacity-50"
                    >
                        {chargement ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                        Retirer l&apos;ami
                    </button>
                </div>
            ) : null}
        </div>
    );
}

/* ==========================================================
   CARTE AMI
   ========================================================== */

function CarteAmi({
    relation,
    onRetirer,
    retraitEnCours,
}: {
    relation: RelationAmitie;
    onRetirer: (etudiantId: string) => void;
    retraitEnCours: boolean;
}) {
    const [menuOuvert, setMenuOuvert] = useState(false);
    const profil = relation.ami;

    if (!profil) return null;

    const nom = nomProfilAmitie(profil);
    const sousTitre = sousTitreProfilAmitie(profil);

    return (
        <div className="rounded-xl border border-ink/15 bg-paper-light p-4 transition hover:border-ink/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
                <Avatar profil={profil} />

                <div className="min-w-0 flex-1">
                    <Link
                        href={`/etudiants/${profil.id}`}
                        className="block truncate text-sm font-semibold text-ink hover:text-ink-soft hover:underline"
                    >
                        {nom}
                    </Link>

                    {sousTitre ? (
                        <p className="mt-0.5 truncate text-xs text-ink-soft">
                            {sousTitre}
                        </p>
                    ) : (
                        <p className="mt-0.5 text-xs text-ink-soft/70">
                            Étudiant Kianja
                        </p>
                    )}

                    {profil.competences?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {profil.competences.slice(0, 3).map((competence) => (
                                <span
                                    key={competence}
                                    className="rounded-md bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-inset ring-ink/15"
                                >
                                    {competence}
                                </span>
                            ))}

                            {profil.competences.length > 3 ? (
                                <span className="rounded-md px-1 py-1 text-[11px] text-ink-soft/70">
                                    +{profil.competences.length - 3}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <MenuRetrait
                    ouvert={menuOuvert}
                    onToggle={() => setMenuOuvert((value) => !value)}
                    onRetirer={() => {
                        setMenuOuvert(false);
                        onRetirer(profil.id);
                    }}
                    chargement={retraitEnCours}
                />
            </div>

            <div className="mt-4 border-t border-ink/10 pt-3">
                <Link
                    href={lienConversation(profil.id, nom)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink/20 px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-ink/5"
                >
                    <MessageCircle className="h-4 w-4" />
                    Message
                </Link>
            </div>
        </div>
    );
}

/* ==========================================================
   CARTE DEMANDE REÇUE
   ========================================================== */

function CarteDemandeRecue({
    demande,
    onAccepter,
    onRefuser,
    actionEnCours,
}: {
    demande: DemandeAmitie;
    onAccepter: (id: string) => void;
    onRefuser: (id: string) => void;
    actionEnCours: string | null;
}) {
    const profil = demande.demandeur;

    if (!profil) return null;

    const nom = nomProfilAmitie(profil);
    const chargement = actionEnCours === demande.id;

    return (
        <div className="rounded-xl border border-ink/15 bg-paper-light p-4 transition hover:border-ink/30 hover:shadow-sm">
            <div className="flex items-center gap-3">
                <Avatar profil={profil} />

                <div className="min-w-0 flex-1">
                    <Link
                        href={`/etudiants/${profil.id}`}
                        className="block truncate text-sm font-semibold text-ink hover:underline"
                    >
                        {nom}
                    </Link>

                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                        {sousTitreProfilAmitie(profil) || "Étudiant Kianja"}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-ink/10 pt-3">
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={chargement}
                    onClick={() => onAccepter(demande.id)}
                    className="flex-1"
                >
                    {chargement ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Check className="mr-2 h-4 w-4" />
                    )}
                    Accepter
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={chargement}
                    onClick={() => onRefuser(demande.id)}
                    className="flex-1"
                >
                    <X className="mr-2 h-4 w-4" />
                    Refuser
                </Button>
            </div>
        </div>
    );
}

/* ==========================================================
   CARTE DEMANDE ENVOYÉE
   ========================================================== */

function CarteDemandeEnvoyee({
    demande,
}: {
    demande: DemandeAmitie;
}) {
    const profil = demande.receveur;

    if (!profil) return null;

    const nom = nomProfilAmitie(profil);

    return (
        <div className="rounded-xl border border-ink/15 bg-paper-light p-4 transition hover:border-ink/30 hover:shadow-sm">
            <div className="flex items-center gap-3">
                <Avatar profil={profil} />

                <div className="min-w-0 flex-1">
                    <Link
                        href={`/etudiants/${profil.id}`}
                        className="block truncate text-sm font-semibold text-ink hover:underline"
                    >
                        {nom}
                    </Link>

                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                        {sousTitreProfilAmitie(profil) || "Étudiant Kianja"}
                    </p>
                </div>

                <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink-soft">
                    En attente
                </span>
            </div>
        </div>
    );
}

/* ==========================================================
   CARTE ÉTUDIANT
   ========================================================== */

function CarteEtudiant({
    etudiant,
    statut,
    demandeRecue,
    actionEnCours,
    onAjouter,
    onAccepter,
    onRefuser,
}: {
    etudiant: EtudiantProfile;
    statut: RelationAvec;
    demandeRecue?: DemandeAmitie;
    actionEnCours: string | null;
    onAjouter: (etudiantId: string) => void;
    onAccepter: (demandeId: string) => void;
    onRefuser: (demandeId: string) => void;
}) {
    const nom = etudiant.utilisateur?.nom ?? "Étudiant";

    const sousTitre = [
        etudiant.universite,
        etudiant.niveauEtude,
    ]
        .filter(Boolean)
        .join(" · ");

    const actionId = demandeRecue?.id ?? etudiant.utilisateurId;
    const chargement = actionEnCours === actionId;

    return (
        <div className="rounded-xl border border-ink/15 bg-paper-light p-4 transition hover:border-ink/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
                <AvatarEtudiant etudiant={etudiant} />

                <div className="min-w-0 flex-1">
                    <Link
                        href={`/etudiants/${etudiant.utilisateurId}`}
                        className="block truncate text-sm font-semibold text-ink hover:text-ink-soft hover:underline"
                    >
                        {nom}
                    </Link>

                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                        {sousTitre || "Étudiant Kianja"}
                    </p>
                </div>
            </div>

            {etudiant.competences?.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {etudiant.competences.slice(0, 3).map((competence) => (
                        <span
                            key={competence}
                            className="rounded-md bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-inset ring-ink/15"
                        >
                            {competence}
                        </span>
                    ))}

                    {etudiant.competences.length > 3 ? (
                        <span className="rounded-md px-1 py-1 text-[11px] text-ink-soft/70">
                            +{etudiant.competences.length - 3}
                        </span>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-4 border-t border-ink/10 pt-3">
                {statut === "aucun" ? (
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={chargement}
                        onClick={() => onAjouter(etudiant.utilisateurId)}
                        className="w-full gap-2"
                    >
                        {chargement ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <UserPlus className="h-4 w-4" />
                        )}
                        Ajouter
                    </Button>
                ) : null}

                {statut === "demande_envoyee" ? (
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full gap-2"
                    >
                        <Check className="h-4 w-4" />
                        Demande envoyée
                    </Button>
                ) : null}

                {statut === "demande_recue" && demandeRecue ? (
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={chargement}
                            onClick={() => onAccepter(demandeRecue.id)}
                            className="flex-1 gap-1.5"
                        >
                            {chargement ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            Accepter
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={chargement}
                            onClick={() => onRefuser(demandeRecue.id)}
                            className="flex-1 gap-1.5"
                        >
                            <X className="h-4 w-4" />
                            Refuser
                        </Button>
                    </div>
                ) : null}

                {statut === "amis" ? (
                    <Link
                        href={lienConversation(
                            etudiant.utilisateurId,
                            nom,
                        )}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink/20 px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-ink/5"
                    >
                        <MessageCircle className="h-4 w-4" />
                        Message
                    </Link>
                ) : null}
            </div>
        </div>
    );
}

/* ==========================================================
   PAGE MES AMIS
   ========================================================== */

export default function AmisPage() {
    const { utilisateur, chargement: chargementAuth } = useAuth();

    const [onglet, setOnglet] = useState<Onglet>("amis");

    const [amis, setAmis] = useState<RelationAmitie[]>([]);
    const [demandesRecues, setDemandesRecues] = useState<DemandeAmitie[]>([]);
    const [demandesEnvoyees, setDemandesEnvoyees] = useState<
        DemandeAmitie[]
    >([]);

    const [annuaire, setAnnuaire] = useState<EtudiantProfile[]>([]);
    const [recherche, setRecherche] = useState("");

    const [relations, setRelations] = useState<RelationsAmitie | null>(
        null,
    );

    const [chargement, setChargement] = useState(true);
    const [chargementAnnuaire, setChargementAnnuaire] = useState(false);

    const [actionEnCours, setActionEnCours] = useState<string | null>(
        null,
    );
    const [retraitEnCours, setRetraitEnCours] = useState<string | null>(
        null,
    );

    const [erreur, setErreur] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    /* ======================================================
       CHARGEMENT INITIAL DES RELATIONS
       ====================================================== */

    useEffect(() => {
        if (chargementAuth || !utilisateur?.id) {
            return;
        }

        let ignore = false;

        const charger = async () => {
            setChargement(true);
            setErreur(null);

            try {
                const [
                    amisData,
                    recuesData,
                    envoyeesData,
                    relationsData,
                ] = await Promise.all([
                    listerAmis(),
                    listerDemandesRecues(),
                    listerDemandesEnvoyees(),
                    chargerRelationsAmitie(),
                ]);

                if (ignore) return;

                setAmis(amisData);
                setDemandesRecues(recuesData);
                setDemandesEnvoyees(envoyeesData);
                setRelations(relationsData);
            } catch (error) {
                if (ignore) return;

                setErreur(
                    error instanceof ApiError
                        ? error.message
                        : "Impossible de charger vos relations.",
                );
            } finally {
                if (!ignore) {
                    setChargement(false);
                }
            }
        };

        void charger();

        return () => {
            ignore = true;
        };
    }, [chargementAuth, utilisateur?.id]);

    /* ======================================================
       CHARGEMENT DE L'ANNUAIRE
       ====================================================== */

    useEffect(() => {
        if (
            chargementAuth ||
            !utilisateur?.id ||
            onglet !== "decouvrir"
        ) {
            return;
        }

        let ignore = false;

        const chargerAnnuaire = async () => {
            setChargementAnnuaire(true);
            setErreur(null);

            try {
                const data = await api.get<EtudiantProfile[]>(
                    "/etudiants",
                );

                if (!ignore) {
                    setAnnuaire(data);
                }
            } catch (error) {
                if (!ignore) {
                    setErreur(
                        error instanceof ApiError
                            ? error.message
                            : "Impossible de charger les étudiants.",
                    );
                }
            } finally {
                if (!ignore) {
                    setChargementAnnuaire(false);
                }
            }
        };

        void chargerAnnuaire();

        return () => {
            ignore = true;
        };
    }, [chargementAuth, onglet, utilisateur?.id]);

    /* ======================================================
       FILTRE RECHERCHE
       ====================================================== */

    const etudiantsFiltres = useMemo(() => {
        const terme = recherche.trim().toLowerCase();

        return annuaire.filter((etudiant) => {
            if (etudiant.utilisateurId === utilisateur?.id) {
                return false;
            }

            if (!terme) {
                return true;
            }

            const nom = etudiant.utilisateur?.nom?.toLowerCase() ?? "";
            const universite =
                etudiant.universite?.toLowerCase() ?? "";
            const niveau =
                etudiant.niveauEtude?.toLowerCase() ?? "";
            const competences =
                etudiant.competences?.join(" ").toLowerCase() ?? "";

            return (
                nom.includes(terme) ||
                universite.includes(terme) ||
                niveau.includes(terme) ||
                competences.includes(terme)
            );
        });
    }, [annuaire, recherche, utilisateur?.id]);

    /* ======================================================
       AJOUTER UN AMI
       ====================================================== */

    const ajouterAmi = useCallback(
        async (etudiantId: string) => {
            setActionEnCours(etudiantId);
            setErreur(null);
            setMessage(null);

            try {
                await envoyerDemandeAmitie(etudiantId);

                /*
                 * On recharge uniquement l'état relationnel.
                 * Cela permet de faire immédiatement passer :
                 * aucun → demande_envoyee
                 */
                const relationsMaj = await chargerRelationsAmitie();
                setRelations(relationsMaj);

                /*
                 * On recharge également les demandes envoyées
                 * afin que l'onglet "Demandes envoyées" soit à jour.
                 */
                const envoyeesMaj = await listerDemandesEnvoyees();
                setDemandesEnvoyees(envoyeesMaj);

                setMessage("Demande d'amitié envoyée.");
            } catch (error) {
                setErreur(
                    error instanceof ApiError
                        ? error.message
                        : "Impossible d'envoyer la demande d'amitié.",
                );
            } finally {
                setActionEnCours(null);
            }
        },
        [],
    );

    /* ======================================================
       RETIRER UN AMI
       ====================================================== */

    const retirer = useCallback(
        async (etudiantId: string) => {
            const relation = amis.find(
                (item) => item.ami?.id === etudiantId,
            );

            if (!relation?.ami) return;

            const nom = nomProfilAmitie(relation.ami);

            const confirme = window.confirm(
                `Voulez-vous vraiment retirer ${nom} de vos amis ?`,
            );

            if (!confirme) return;

            setRetraitEnCours(etudiantId);
            setErreur(null);
            setMessage(null);

            try {
                await retirerAmitie(etudiantId);

                setAmis((courant) =>
                    courant.filter(
                        (item) => item.ami?.id !== etudiantId,
                    ),
                );

                const relationsMaj = await chargerRelationsAmitie();
                setRelations(relationsMaj);

                setMessage(
                    `${nom} a été retiré de vos amis.`,
                );
            } catch (error) {
                setErreur(
                    error instanceof ApiError
                        ? error.message
                        : "Impossible de retirer cet ami.",
                );
            } finally {
                setRetraitEnCours(null);
            }
        },
        [amis],
    );

    /* ======================================================
       ACCEPTER UNE DEMANDE
       ====================================================== */

    const accepter = useCallback(
        async (demandeId: string) => {
            setActionEnCours(demandeId);
            setErreur(null);
            setMessage(null);

            try {
                await accepterDemandeAmitie(demandeId);

                const demande = demandesRecues.find(
                    (item) => item.id === demandeId,
                );

                setDemandesRecues((courant) =>
                    courant.filter(
                        (item) => item.id !== demandeId,
                    ),
                );

                if (demande?.demandeur) {
                    const nouvelAmi: RelationAmitie = {
                        id: demande.id,
                        statut: "acceptee",
                        dateCreation: demande.dateCreation,
                        dateReponse: new Date().toISOString(),
                        ami: demande.demandeur,
                    };

                    setAmis((courant) => {
                        const existe = courant.some(
                            (item) =>
                                item.ami?.id ===
                                demande.demandeur?.id,
                        );

                        return existe
                            ? courant
                            : [...courant, nouvelAmi];
                    });
                }

                const relationsMaj =
                    await chargerRelationsAmitie();

                setRelations(relationsMaj);

                setMessage("Demande d'amitié acceptée.");
                setOnglet("amis");
            } catch (error) {
                setErreur(
                    error instanceof ApiError
                        ? error.message
                        : "Impossible d'accepter cette demande.",
                );
            } finally {
                setActionEnCours(null);
            }
        },
        [demandesRecues],
    );

    /* ======================================================
       REFUSER UNE DEMANDE
       ====================================================== */

    const refuser = useCallback(
        async (demandeId: string) => {
            setActionEnCours(demandeId);
            setErreur(null);
            setMessage(null);

            try {
                await refuserDemandeAmitie(demandeId);

                setDemandesRecues((courant) =>
                    courant.filter(
                        (item) => item.id !== demandeId,
                    ),
                );

                const relationsMaj =
                    await chargerRelationsAmitie();

                setRelations(relationsMaj);

                setMessage("Demande d'amitié refusée.");
            } catch (error) {
                setErreur(
                    error instanceof ApiError
                        ? error.message
                        : "Impossible de refuser cette demande.",
                );
            } finally {
                setActionEnCours(null);
            }
        },
        [],
    );

    /* ======================================================
       OBTENIR LE STATUT D'UN ÉTUDIANT
       ====================================================== */

    const obtenirStatut = useCallback(
        (etudiantId: string): RelationAvec => {
            if (!relations) {
                return "aucun";
            }

            return relationAvec(relations, etudiantId);
        },
        [relations],
    );

    /* ======================================================
       CONTENU
       ====================================================== */

    const contenu = useMemo(() => {
        if (chargement) {
            return (
                <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-ink/15 bg-paper-light">
                    <div className="flex items-center gap-3 text-sm text-ink-soft">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Chargement de vos relations...
                    </div>
                </div>
            );
        }

        /* --------------------------------------------------
           AMIS
           -------------------------------------------------- */

        if (onglet === "amis") {
            if (amis.length === 0) {
                return (
                    <EtatVide
                        icon={<Users className="h-6 w-6" />}
                        titre="Vous n'avez pas encore d'amis"
                        description="Ajoutez d'autres étudiants de Kianja pour échanger avec eux et développer votre réseau."
                        action={
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                    setOnglet("decouvrir")
                                }
                                className="gap-2"
                            >
                                <UserPlus className="h-4 w-4" />
                                Découvrir des étudiants
                            </Button>
                        }
                    />
                );
            }

            return (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {amis.map((relation) => (
                        <CarteAmi
                            key={relation.id}
                            relation={relation}
                            onRetirer={retirer}
                            retraitEnCours={
                                relation.ami?.id ===
                                retraitEnCours
                            }
                        />
                    ))}
                </div>
            );
        }

        /* --------------------------------------------------
           DEMANDES REÇUES
           -------------------------------------------------- */

        if (onglet === "recues") {
            if (demandesRecues.length === 0) {
                return (
                    <EtatVide
                        icon={<UserPlus className="h-6 w-6" />}
                        titre="Aucune demande reçue"
                        description="Les demandes d'amitié que d'autres étudiants vous enverront apparaîtront ici."
                    />
                );
            }

            return (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {demandesRecues.map((demande) => (
                        <CarteDemandeRecue
                            key={demande.id}
                            demande={demande}
                            onAccepter={accepter}
                            onRefuser={refuser}
                            actionEnCours={actionEnCours}
                        />
                    ))}
                </div>
            );
        }

        /* --------------------------------------------------
           DEMANDES ENVOYÉES
           -------------------------------------------------- */

        if (onglet === "envoyees") {
            if (demandesEnvoyees.length === 0) {
                return (
                    <EtatVide
                        icon={<UserPlus className="h-6 w-6" />}
                        titre="Aucune demande envoyée"
                        description="Lorsque vous envoyez une demande d'amitié à un autre étudiant, elle apparaîtra ici."
                        action={
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    setOnglet("decouvrir")
                                }
                                className="gap-2"
                            >
                                <UserPlus className="h-4 w-4" />
                                Trouver des étudiants
                            </Button>
                        }
                    />
                );
            }

            return (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {demandesEnvoyees.map((demande) => (
                        <CarteDemandeEnvoyee
                            key={demande.id}
                            demande={demande}
                        />
                    ))}
                </div>
            );
        }

        /* --------------------------------------------------
           DÉCOUVRIR
           -------------------------------------------------- */

        if (chargementAnnuaire) {
            return (
                <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-ink/15 bg-paper-light">
                    <div className="flex items-center gap-3 text-sm text-ink-soft">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Chargement des étudiants...
                    </div>
                </div>
            );
        }

        return (
            <div>
                {/* RECHERCHE */}

                <div className="mb-5 rounded-xl border border-ink/15 bg-paper-light p-4">
                    <div className="relative">
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/70"
                            aria-hidden="true"
                        />

                        <Input
                            value={recherche}
                            onChange={(event) =>
                                setRecherche(event.target.value)
                            }
                            placeholder="Rechercher un étudiant par nom, université, niveau ou compétence..."
                            aria-label="Rechercher un étudiant"
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* RÉSULTATS */}

                {etudiantsFiltres.length === 0 ? (
                    <EtatVide
                        icon={<Search className="h-6 w-6" />}
                        titre="Aucun étudiant trouvé"
                        description={
                            recherche.trim()
                                ? "Aucun étudiant ne correspond à votre recherche."
                                : "Aucun autre étudiant n'est disponible dans l'annuaire."
                        }
                    />
                ) : (
                    <>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-ink">
                                Étudiants à découvrir
                            </h2>

                            <span className="text-xs text-ink-soft">
                                {etudiantsFiltres.length} étudiant
                                {etudiantsFiltres.length > 1
                                    ? "s"
                                    : ""}
                            </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {etudiantsFiltres.map((etudiant) => {
                                const statut = obtenirStatut(
                                    etudiant.utilisateurId,
                                );

                                const demandeRecue =
                                    relations?.recuesParEtudiant.get(
                                        etudiant.utilisateurId,
                                    );

                                return (
                                    <CarteEtudiant
                                        key={
                                            etudiant.utilisateurId
                                        }
                                        etudiant={etudiant}
                                        statut={statut}
                                        demandeRecue={
                                            demandeRecue
                                        }
                                        actionEnCours={
                                            actionEnCours
                                        }
                                        onAjouter={ajouterAmi}
                                        onAccepter={accepter}
                                        onRefuser={refuser}
                                    />
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        );
    }, [
        accepter,
        actionEnCours,
        amis,
        chargement,
        chargementAnnuaire,
        demandesEnvoyees,
        demandesRecues,
        etudiantsFiltres,
        obtenirStatut,
        onglet,
        refuser,
        relations,
        retraitEnCours,
        retirer,
    ]);

    /* ======================================================
       AUTHENTIFICATION
       ====================================================== */

    if (chargementAuth) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-paper p-4 sm:p-6 lg:p-8">
                <div className="flex min-h-[400px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            </main>
        );
    }

    if (!utilisateur) {
        return null;
    }

    /* ======================================================
       RENDU FINAL
       ====================================================== */

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-paper p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
                {/* EN-TÊTE */}

                <div className="mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-ink-soft">
                                <Users className="h-4 w-4" />
                                Communauté
                            </div>

                            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                                Mes amis
                            </h1>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
                                Gérez vos relations avec les autres étudiants de Kianja.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                                setOnglet("decouvrir")
                            }
                            className="gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            Trouver des étudiants
                        </Button>
                    </div>
                </div>

                {/* ERREUR */}

                {erreur ? (
                    <div className="mb-5 flex items-start gap-3 rounded-lg border border-brique/30 bg-brique/10 px-4 py-3 text-sm text-brique">
                        <X className="mt-0.5 h-4 w-4 shrink-0" />

                        <span>{erreur}</span>

                        <button
                            type="button"
                            onClick={() => setErreur(null)}
                            className="ml-auto shrink-0 text-brique/70 hover:text-brique"
                            aria-label="Fermer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : null}

                {/* MESSAGE DE SUCCÈS */}

                {message ? (
                    <div className="mb-5 flex items-start gap-3 rounded-lg border border-ink/15 bg-paper-light px-4 py-3 text-sm text-ink-soft shadow-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-rice" />

                        <span>{message}</span>

                        <button
                            type="button"
                            onClick={() => setMessage(null)}
                            className="ml-auto shrink-0 text-ink-soft/70 hover:text-ink"
                            aria-label="Fermer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : null}

                {/* ONGLET */}

                <div className="mb-6 overflow-x-auto">
                    <nav
                        className="flex min-w-max gap-6"
                        aria-label="Relations"
                    >
                        <OngletButton
                            actif={onglet === "amis"}
                            onClick={() => setOnglet("amis")}
                            compteur={amis.length}
                        >
                            Amis
                        </OngletButton>

                        <OngletButton
                            actif={onglet === "recues"}
                            onClick={() => setOnglet("recues")}
                            compteur={demandesRecues.length}
                        >
                            Demandes reçues
                        </OngletButton>

                        <OngletButton
                            actif={onglet === "envoyees"}
                            onClick={() =>
                                setOnglet("envoyees")
                            }
                            compteur={demandesEnvoyees.length}
                        >
                            Demandes envoyées
                        </OngletButton>

                        <OngletButton
                            actif={onglet === "decouvrir"}
                            onClick={() =>
                                setOnglet("decouvrir")
                            }
                        >
                            Découvrir
                        </OngletButton>
                    </nav>
                </div>

                {/* CONTENU */}

                {contenu}
            </div>
        </main>
    );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useAuth,
  roleLabel,
} from "@/lib/auth-context";

import { navigationParRole } from "@/lib/nav-links";
import { getFileUrl } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";

export function Navbar() {
  // ==========================================================
  // AUTHENTIFICATION
  // ==========================================================

  const {
    utilisateur,
    deconnecter,
    chargement,
  } = useAuth();

  const pathname = usePathname();

  // ==========================================================
  // ÉTATS
  // ==========================================================

  const [menuProfilOuvert, setMenuProfilOuvert] =
    useState(false);

  const [menuOuvert, setMenuOuvert] =
    useState<string | null>(null);

  // ==========================================================
  // RÉFÉRENCE NAVBAR
  // ==========================================================

  const navbarRef = useRef<HTMLElement>(null);

  // ==========================================================
  // NAVIGATION SELON LE RÔLE
  // ==========================================================

  const groupes = utilisateur
    ? navigationParRole[utilisateur.role] ?? []
    : [];

  // ==========================================================
  // SÉPARATION DES LIENS
  // ==========================================================

  const liensTexte = groupes.filter(
    (groupe) => !groupe.icon,
  );

  const liensIcones = groupes.filter(
    (groupe) => groupe.icon,
  );

  // ==========================================================
  // ORDRE DES ICÔNES
  // ==========================================================

  const ordreIcones = [
    "Messages",
    "Notifications",
    "Paramètres",
  ];

  const liensIconesTries = [...liensIcones].sort(
    (a, b) => {
      const indexA = ordreIcones.indexOf(a.label);
      const indexB = ordreIcones.indexOf(b.label);

      return (
        (indexA === -1 ? 99 : indexA) -
        (indexB === -1 ? 99 : indexB)
      );
    },
  );

  // ==========================================================
  // FERMER LES MENUS
  // ==========================================================

  const fermerMenus = () => {
    setMenuOuvert(null);
    setMenuProfilOuvert(false);
  };

  // ==========================================================
  // CLIC À L'EXTÉRIEUR + ESCAPE
  // ==========================================================

  useEffect(() => {
    function gererInteraction(event: MouseEvent | KeyboardEvent) {
      // Escape
      if (
        event instanceof KeyboardEvent &&
        event.key === "Escape"
      ) {
        fermerMenus();
        return;
      }

      // Clic extérieur
      if (
        event instanceof MouseEvent &&
        navbarRef.current &&
        !navbarRef.current.contains(
          event.target as Node,
        )
      ) {
        fermerMenus();
      }
    }

    document.addEventListener(
      "mousedown",
      gererInteraction,
    );

    document.addEventListener(
      "keydown",
      gererInteraction,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        gererInteraction,
      );

      document.removeEventListener(
        "keydown",
        gererInteraction,
      );
    };
  }, []);

  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  function handleDeconnexion() {
    fermerMenus();
    deconnecter();
  }

  // ==========================================================
  // LIEN ACTIF
  // ==========================================================

  function estActif(href: string) {
    if (pathname === href) {
      return true;
    }

    if (href === "/tableau-de-bord") {
      return false;
    }

    return pathname.startsWith(`${href}/`);
  }

  // ==========================================================
  // GROUPE ACTIF
  // ==========================================================

  function groupeEstActif(
    groupe: (typeof groupes)[number],
  ) {
    if (groupe.href) {
      return estActif(groupe.href);
    }

    return (
      groupe.liens?.some((lien) =>
        estActif(lien.href),
      ) ?? false
    );
  }

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <header
      ref={navbarRef}
      className="
        sticky top-0 z-40
        border-b border-ink/15
        bg-paper/95
        backdrop-blur-md
      "
    >
      <div
        className="
          mx-auto flex max-w-7xl
          items-center gap-2
          px-3 py-2
          sm:px-4
        "
      >
        {/* ====================================================
            LOGO
            ==================================================== */}

        <Link
          href={
            utilisateur
              ? "/tableau-de-bord"
              : "/"
          }
          onClick={fermerMenus}
          className="
            flex shrink-0
            items-center gap-2
            rounded-lg
            px-1.5 py-1
            transition-colors
            hover:bg-ink/5
          "
          aria-label="Kianja - Accueil"
        >
          <span
            className="
              flex h-8 w-8
              items-center justify-center
              rounded-full
              border-2 border-rice
              font-mono text-[10px]
              font-bold text-rice
            "
            aria-hidden="true"
          >
            K
          </span>

          <span
            className="
              hidden
              font-display text-lg
              font-semibold tracking-tight
              sm:block
            "
          >
            Kianja
          </span>
        </Link>

        {/* ====================================================
            NAVIGATION PRINCIPALE
            ==================================================== */}

        {!chargement && utilisateur && (
          <nav
            className="
              flex flex-1
              items-center gap-0.5
              overflow-x-auto
              scrollbar-none
            "
            aria-label="Navigation principale"
          >
            {liensTexte.map((groupe) => {
              const estGroupe =
                !!(
                  groupe.liens &&
                  groupe.liens.length > 0
                );

              const actif =
                groupeEstActif(groupe);

              const ouvert =
                menuOuvert === groupe.label;

              // ==================================================
              // LIEN SIMPLE
              // ==================================================

              if (
                groupe.href &&
                !estGroupe
              ) {
                return (
                  <Link
                    key={groupe.href}
                    href={groupe.href}
                    onClick={fermerMenus}
                    aria-current={
                      actif
                        ? "page"
                        : undefined
                    }
                    className={clsx(
                      `
                        shrink-0
                        rounded-lg
                        px-2.5 py-2
                        text-xs
                        font-medium
                        transition-all
                        sm:px-3
                        sm:text-sm
                      `,
                      actif
                        ? `
                          bg-ocre/10
                          text-ocre-dark
                        `
                        : `
                          text-ink-soft
                          hover:bg-ink/5
                          hover:text-ink
                        `,
                    )}
                  >
                    {groupe.label}
                  </Link>
                );
              }

              // ==================================================
              // GROUPE AVEC SOUS-MENU
              // ==================================================

              if (estGroupe) {
                return (
                  <div
                    key={groupe.label}
                    className="
                      relative shrink-0
                    "
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuProfilOuvert(
                          false,
                        );

                        setMenuOuvert(
                          ouvert
                            ? null
                            : groupe.label,
                        );
                      }}
                      className={clsx(
                        `
                          flex items-center
                          gap-1
                          rounded-lg
                          px-2.5 py-2
                          text-xs
                          font-medium
                          transition-all
                          sm:px-3
                          sm:text-sm
                        `,
                        actif
                          ? `
                            bg-ocre/10
                            text-ocre-dark
                          `
                          : `
                            text-ink-soft
                            hover:bg-ink/5
                            hover:text-ink
                          `,
                      )}
                      aria-expanded={ouvert}
                      aria-haspopup="menu"
                    >
                      {groupe.label}

                      <ChevronDown
                        size={14}
                        className={clsx(
                          `
                            transition-transform
                            duration-200
                          `,
                          ouvert &&
                            "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {/* ==========================================
                        SOUS-MENU
                        ========================================== */}

                    {ouvert && (
                      <div
                        role="menu"
                        className="
                          absolute left-0
                          top-full z-50
                          mt-2 w-60
                          overflow-hidden
                          rounded-xl
                          border border-ink/10
                          bg-paper
                          py-1
                          shadow-xl
                          animate-in
                          fade-in
                          slide-in-from-top-1
                          duration-150
                        "
                      >
                        {/* TITRE */}

                        <div
                          className="
                            border-b
                            border-ink/10
                            px-4 py-3
                          "
                        >
                          <p
                            className="
                              text-xs
                              font-medium
                              text-ink
                            "
                          >
                            {groupe.label}
                          </p>
                        </div>

                        {/* SOUS-LIENS */}

                        {groupe.liens?.map(
                          (lien) => {
                            const sousLienActif =
                              estActif(
                                lien.href,
                              );

                            return (
                              <Link
                                key={
                                  lien.href
                                }
                                href={
                                  lien.href
                                }
                                role="menuitem"
                                aria-current={
                                  sousLienActif
                                    ? "page"
                                    : undefined
                                }
                                onClick={
                                  fermerMenus
                                }
                                className={clsx(
                                  `
                                    flex
                                    items-center
                                    px-4 py-2.5
                                    text-sm
                                    transition-colors
                                  `,
                                  sousLienActif
                                    ? `
                                      bg-ocre/10
                                      font-medium
                                      text-ocre-dark
                                    `
                                    : `
                                      text-ink-soft
                                      hover:bg-ink/5
                                      hover:text-ink
                                    `,
                                )}
                              >
                                {
                                  lien.label
                                }
                              </Link>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </nav>
        )}

        {/* ====================================================
            ACTIONS À DROITE
            ==================================================== */}

        <div
          className="
            ml-auto
            flex shrink-0
            items-center gap-0.5
          "
        >
          {/* ==================================================
              MESSAGES / NOTIFICATIONS / PARAMÈTRES
              ================================================== */}

          {!chargement &&
            utilisateur &&
            liensIconesTries.length > 0 && (
              <div
                className="
                  flex items-center
                  gap-0.5
                "
              >
                {liensIconesTries.map(
                  (groupe) => {
                    const Icon =
                      groupe.icon;

                    if (!Icon) {
                      return null;
                    }

                    const actif =
                      groupeEstActif(
                        groupe,
                      );

                    const ouvert =
                      menuOuvert ===
                      groupe.label;

                    const estParametres =
                      groupe.label ===
                      "Paramètres";

                    // ==================================================
                    // PARAMÈTRES
                    // ==================================================

                    if (
                      estParametres
                    ) {
                      return (
                        <div
                          key={
                            groupe.label
                          }
                          className="
                            relative
                          "
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuProfilOuvert(
                                false,
                              );

                              setMenuOuvert(
                                ouvert
                                  ? null
                                  : groupe.label,
                              );
                            }}
                            title="Paramètres"
                            aria-label="Paramètres"
                            aria-expanded={
                              ouvert
                            }
                            aria-haspopup="menu"
                            className={clsx(
                              `
                                flex h-9 w-9
                                items-center
                                justify-center
                                rounded-lg
                                transition-all
                              `,
                              ouvert ||
                                actif
                                ? `
                                  bg-ocre/10
                                  text-ocre-dark
                                `
                                : `
                                  text-ink-soft
                                  hover:bg-ink/5
                                  hover:text-ink
                                `,
                            )}
                          >
                            <Icon
                              size={18}
                              strokeWidth={
                                actif
                                  ? 2.3
                                  : 2
                              }
                            />
                          </button>

                          {/* MENU PARAMÈTRES */}

                          {ouvert && (
                            <div
                              role="menu"
                              className="
                                absolute right-0
                                top-full z-50
                                mt-2 w-64
                                overflow-hidden
                                rounded-xl
                                border border-ink/10
                                bg-paper
                                shadow-xl
                                animate-in
                                fade-in
                                slide-in-from-top-1
                                duration-150
                              "
                            >
                              {/* EN-TÊTE */}

                              <div
                                className="
                                  border-b
                                  border-ink/10
                                  px-4 py-3
                                "
                              >
                                <p
                                  className="
                                    text-sm
                                    font-medium
                                    text-ink
                                  "
                                >
                                  Paramètres
                                </p>

                                <p
                                  className="
                                    mt-0.5
                                    text-xs
                                    text-ink-soft
                                  "
                                >
                                  Personnalisez
                                  votre expérience
                                </p>
                              </div>

                              {/* LIENS */}

                              {groupe.liens?.map(
                                (lien) => {
                                  const lienActif =
                                    estActif(
                                      lien.href,
                                    );

                                  return (
                                    <Link
                                      key={
                                        lien.href
                                      }
                                      href={
                                        lien.href
                                      }
                                      role="menuitem"
                                      aria-current={
                                        lienActif
                                          ? "page"
                                          : undefined
                                      }
                                      onClick={
                                        fermerMenus
                                      }
                                      className={clsx(
                                        `
                                          flex
                                          items-center
                                          px-4 py-2.5
                                          text-sm
                                          transition-colors
                                        `,
                                        lienActif
                                          ? `
                                            bg-ocre/10
                                            font-medium
                                            text-ocre-dark
                                          `
                                          : `
                                            text-ink-soft
                                            hover:bg-ink/5
                                            hover:text-ink
                                          `,
                                      )}
                                    >
                                      {
                                        lien.label
                                      }
                                    </Link>
                                  );
                                },
                              )}

                              {/* APPARENCE */}

                              <div
                                className="
                                  border-t
                                  border-ink/10
                                  px-4 py-3
                                "
                              >
                                <div
                                  className="
                                    flex
                                    items-center
                                    justify-between
                                    gap-3
                                  "
                                >
                                  <div>
                                    <p
                                      className="
                                        text-sm
                                        font-medium
                                        text-ink
                                      "
                                    >
                                      Apparence
                                    </p>

                                    <p
                                      className="
                                        mt-0.5
                                        text-[11px]
                                        text-ink-soft
                                      "
                                    >
                                      Changer le thème
                                    </p>
                                  </div>

                                  <BasculeTheme />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ==================================================
                    // MESSAGES / NOTIFICATIONS
                    // ==================================================

                    if (groupe.href) {
                      return (
                        <Link
                          key={
                            groupe.href
                          }
                          href={
                            groupe.href
                          }
                          title={
                            groupe.label
                          }
                          aria-label={
                            groupe.label
                          }
                          aria-current={
                            actif
                              ? "page"
                              : undefined
                          }
                          onClick={
                            fermerMenus
                          }
                          className={clsx(
                            `
                              flex h-9 w-9
                              items-center
                              justify-center
                              rounded-lg
                              transition-all
                            `,
                            actif
                              ? `
                                bg-ocre/10
                                text-ocre-dark
                              `
                              : `
                                text-ink-soft
                                hover:bg-ink/5
                                hover:text-ink
                              `,
                          )}
                        >
                          <Icon
                            size={18}
                            strokeWidth={
                              actif
                                ? 2.3
                                : 2
                            }
                          />
                        </Link>
                      );
                    }

                    return null;
                  },
                )}
              </div>
            )}

          {/* ==================================================
              SÉPARATEUR
              ================================================== */}

          {utilisateur && (
            <div
              className="
                mx-1.5 h-6 w-px
                bg-ink/15
                sm:mx-2
              "
              aria-hidden="true"
            />
          )}

          {/* ====================================================
              PROFIL
              ==================================================== */}

          {chargement ? null : utilisateur ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOuvert(null);

                  setMenuProfilOuvert(
                    (ouvert) =>
                      !ouvert,
                  );
                }}
                className="
                  flex items-center
                  gap-1.5
                  rounded-lg
                  px-1.5 py-1
                  transition-all
                  hover:bg-ink/5
                "
                aria-expanded={
                  menuProfilOuvert
                }
                aria-haspopup="menu"
                aria-label="Ouvrir le menu du profil"
                title="Mon profil"
              >
                {/* AVATAR */}

                <div
                  className="
                    flex h-8 w-8
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    bg-ocre/10
                    text-ocre-dark
                    ring-1
                    ring-ink/10
                  "
                >
                  {utilisateur.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        getFileUrl(
                          utilisateur.photoUrl,
                        ) ?? undefined
                      }
                      alt={`Photo de ${utilisateur.nom}`}
                      className="
                        h-full w-full
                        object-cover
                      "
                    />
                  ) : (
                    <User
                      size={15}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* NOM + RÔLE */}

                <div
                  className="
                    hidden
                    max-w-28
                    flex-col
                    text-left
                    leading-tight
                    sm:flex
                  "
                >
                  <span
                    className="
                      truncate
                      text-xs
                      text-ink
                    "
                  >
                    {utilisateur.nom}
                  </span>

                  <span
                    className="
                      truncate
                      text-[9px]
                      font-mono
                      uppercase
                      tracking-wider
                      text-ink-soft/70
                    "
                  >
                    {roleLabel(
                      utilisateur.role,
                    )}
                  </span>
                </div>

                <ChevronDown
                  size={13}
                  className={clsx(
                    `
                      hidden
                      transition-transform
                      duration-200
                      sm:block
                    `,
                    menuProfilOuvert &&
                      "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* ==================================================
                  MENU PROFIL
                  ================================================== */}

              {menuProfilOuvert && (
                <div
                  role="menu"
                  className="
                    absolute right-0
                    top-full z-50
                    mt-2 w-56
                    overflow-hidden
                    rounded-xl
                    border border-ink/10
                    bg-paper
                    shadow-xl
                    animate-in
                    fade-in
                    slide-in-from-top-1
                    duration-150
                  "
                >
                  {/* INFORMATIONS */}

                  <div
                    className="
                      border-b
                      border-ink/10
                      px-4 py-3
                    "
                  >
                    <p
                      className="
                        truncate
                        text-sm
                        font-medium
                        text-ink
                      "
                    >
                      {utilisateur.nom}
                    </p>

                    <p
                      className="
                        truncate
                        text-xs
                        text-ink-soft
                      "
                    >
                      {utilisateur.email}
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        font-mono
                        uppercase
                        tracking-wider
                        text-ink-soft/60
                      "
                    >
                      {roleLabel(
                        utilisateur.role,
                      )}
                    </p>
                  </div>

                  {/* MON PROFIL */}

                  <Link
                    href="/tableau-de-bord/profil"
                    role="menuitem"
                    aria-current={
                      estActif(
                        "/tableau-de-bord/profil",
                      )
                        ? "page"
                        : undefined
                    }
                    onClick={
                      fermerMenus
                    }
                    className={clsx(
                      `
                        flex items-center
                        gap-3
                        px-4 py-2.5
                        text-sm
                        transition-colors
                      `,
                      estActif(
                        "/tableau-de-bord/profil",
                      )
                        ? `
                          bg-ocre/10
                          font-medium
                          text-ocre-dark
                        `
                        : `
                          text-ink-soft
                          hover:bg-ink/5
                          hover:text-ink
                        `,
                    )}
                  >
                    <User
                      size={15}
                      aria-hidden="true"
                    />

                    <span>
                      Mon profil
                    </span>
                  </Link>

                  {/* DÉCONNEXION */}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={
                      handleDeconnexion
                    }
                    className="
                      flex w-full
                      items-center
                      gap-3
                      border-t
                      border-ink/10
                      px-4 py-2.5
                      text-left
                      text-sm
                      text-brique
                      transition-colors
                      hover:bg-brique/5
                    "
                  >
                    <LogOut
                      size={15}
                      aria-hidden="true"
                    />

                    <span>
                      Se déconnecter
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ==================================================
               UTILISATEUR NON CONNECTÉ
               ================================================== */

            <div
              className="
                flex items-center
                gap-1.5
                border-l
                border-ink/15
                pl-2
                sm:gap-2
                sm:pl-3
              "
            >
              <Link href="/connexion">
                <Button
                  variant="ghost"
                  size="sm"
                  className="
                    h-8 px-2
                    text-[11px]
                    sm:px-2.5
                    sm:text-xs
                  "
                >
                  Se connecter
                </Button>
              </Link>

              <Link href="/inscription">
                <Button
                  variant="primary"
                  size="sm"
                  className="
                    h-8 px-2
                    text-[11px]
                    sm:px-2.5
                    sm:text-xs
                  "
                >
                  S&apos;inscrire
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
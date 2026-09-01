"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Search,
  User,
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
import { MessagesLink } from "@/components/ui/MessagesLink";
import { NotificationBell } from "@/components/ui/NotificationBell";

export function Navbar() {
  const {
    utilisateur,
    deconnecter,
    chargement,
  } = useAuth();

  const pathname = usePathname();

  const [
    menuProfilOuvert,
    setMenuProfilOuvert,
  ] = useState(false);

  const [
    menuParametresOuvert,
    setMenuParametresOuvert,
  ] = useState(false);

  const navbarRef =
    useRef<HTMLElement>(null);

  /*
   * ==========================================================
   * NAVIGATION TOPBAR
   * ==========================================================
   */

  const groupes = utilisateur
    ? navigationParRole[
        utilisateur.role
      ] ?? []
    : [];

  /*
   * La Navbar conserve uniquement :
   *
   * - Messages
   * - Paramètres
   *
   * Les autres liens sont affichés
   * dans la Sidebar.
   */

  const liensTopbar = groupes.filter(
    (item) => item.label === "Paramètres",
  );

  /*
   * ==========================================================
   * LIEN ACTIF
   * ==========================================================
   */

  function isActive(href: string): boolean {
    if (pathname === href) {
      return true;
    }

    /*
     * Le dashboard principal ne doit pas
     * être actif sur ses sous-pages.
     */

    if (
      href ===
      "/tableau-de-bord"
    ) {
      return false;
    }

    return pathname.startsWith(
      `${href}/`,
    );
  }

  /*
   * ==========================================================
   * FERMER LES MENUS
   * ==========================================================
   */

  function closeMenus() {
    setMenuProfilOuvert(false);
    setMenuParametresOuvert(false);
  }

  /*
   * ==========================================================
   * DÉCONNEXION
   * ==========================================================
   */

  function logout() {
    closeMenus();
    deconnecter();
  }

  /*
   * ==========================================================
   * CLIC EXTÉRIEUR + ESCAPE
   * ==========================================================
   */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(
          event.target as Node,
        )
      ) {
        closeMenus();
      }
    }

    function handleKeyboard(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleKeyboard,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleKeyboard,
      );
    };
  }, []);

  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <header
      ref={navbarRef}
      className="
        fixed
        left-0
        right-0
        top-0
        z-50
        h-16
        border-b
        border-ink/10
        bg-paper/95
        backdrop-blur-md
        lg:left-[var(--sidebar-width)]
      "
    >
      <div
        className="
          flex
          h-full
          items-center
          px-4
          sm:px-5
        "
      >
        {/* ====================================================
            LOGO MOBILE
        ==================================================== */}

        <Link
          href={
            utilisateur
              ? "/tableau-de-bord"
              : "/"
          }
          className="
            flex
            items-center
            gap-2
            lg:hidden
          "
          aria-label="Kianja"
        >
          <span
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              border-2
              border-rice
              bg-ink
              font-mono
              text-[10px]
              font-bold
              text-rice
            "
          >
            K
          </span>

          <span
            className="
              hidden
              font-display
              text-lg
              font-semibold
              sm:block
            "
          >
            Kianja
          </span>
        </Link>

        {/* ====================================================
            ESPACE
        ==================================================== */}

        <div className="flex-1" />

        {/* ====================================================
            ACTIONS TOPBAR
        ==================================================== */}

        <div
          className="
            flex
            items-center
            gap-1
          "
        >
          {/* ==================================================
              RECHERCHE DESKTOP
          ================================================== */}

          <form
            action="/services"
            role="search"
            className="
              mr-2
              hidden
              md:block
            "
          >
            <div
              className="
                relative
                w-52
                lg:w-64
                xl:w-72
              "
            >
              <Search
                size={15}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-ink-soft/60
                "
              />

              <input
                type="search"
                name="q"
                placeholder="Rechercher..."
                aria-label="Rechercher"
                className="
                  h-9
                  w-full
                  rounded-full
                  border
                  border-ink/15
                  bg-paper-light
                  pl-9
                  pr-3
                  text-xs
                  text-ink
                  outline-none
                  transition
                  placeholder:text-ink-soft/50
                  focus:border-rice
                  focus:ring-2
                  focus:ring-rice/10
                "
              />
            </div>
          </form>

          {/* ==================================================
              RECHERCHE MOBILE
          ================================================== */}

          <Link
            href="/services"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              text-ink-soft
              transition-colors
              hover:bg-ink/5
              hover:text-ink
              md:hidden
            "
            aria-label="Rechercher"
            title="Rechercher"
          >
            <Search size={18} />
          </Link>

          {/* ==================================================
              UTILISATEUR CONNECTÉ
          ================================================== */}

          {!chargement &&
            utilisateur && (
              <>
                {/* ==============================================
                    MESSAGES / PARAMÈTRES
                ============================================== */}

                {liensTopbar.map(
                  (item) => {
                    /*
                     * ==========================================
                     * PARAMÈTRES
                     * ==========================================
                     */

                    if (
                      item.label ===
                      "Paramètres"
                    ) {
                      return (
                        <div
                          key={
                            item.label
                          }
                          className="relative"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuProfilOuvert(
                                false,
                              );

                              setMenuParametresOuvert(
                                (value) =>
                                  !value,
                              );
                            }}
                            aria-label="Paramètres"
                            aria-expanded={
                              menuParametresOuvert
                            }
                            aria-haspopup="menu"
                            title="Paramètres"
                            className={`
                              flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-lg
                              transition-colors

                              ${
                                menuParametresOuvert
                                  ? "bg-ink/10 text-ink"
                                  : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                              }
                            `}
                          >
                            {item.icon && (
                              <item.icon
                                size={18}
                              />
                            )}
                          </button>

                          {/* MENU PARAMÈTRES */}

                          {menuParametresOuvert && (
                            <div
                              role="menu"
                              className="
                                absolute
                                right-0
                                top-full
                                z-[100]
                                mt-2
                                w-64
                                overflow-hidden
                                rounded-xl
                                border
                                border-ink/10
                                bg-paper
                                shadow-xl
                              "
                            >
                              <div
                                className="
                                  border-b
                                  border-ink/10
                                  px-4
                                  py-3
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
                                  votre
                                  expérience
                                </p>
                              </div>

                              {/* LIENS */}

                              {item.liens?.map(
                                (link) => {
                                  if (
                                    !link.href
                                  ) {
                                    return null;
                                  }

                                  return (
                                    <Link
                                      key={
                                        link.href
                                      }
                                      href={
                                        link.href
                                      }
                                      onClick={
                                        closeMenus
                                      }
                                      role="menuitem"
                                      className="
                                        block
                                        px-4
                                        py-2.5
                                        text-sm
                                        text-ink-soft
                                        transition-colors
                                        hover:bg-ink/5
                                        hover:text-ink
                                      "
                                    >
                                      {
                                        link.label
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
                                  px-4
                                  py-3
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
                                      Thème
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

                    return null;
                  },
                )}

                {/* ==================================================
                    MESSAGES
                ================================================== */}

                <MessagesLink />

                {/* ==================================================
                    NOTIFICATIONS
                ================================================== */}

                <NotificationBell />
              </>
            )}

          {/* ====================================================
              SÉPARATEUR
          ==================================================== */}

          {utilisateur && (
            <div
              className="
                mx-2
                h-6
                w-px
                bg-ink/10
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
                  setMenuParametresOuvert(
                    false,
                  );

                  setMenuProfilOuvert(
                    (value) =>
                      !value,
                  );
                }}
                aria-label="Menu du profil"
                aria-expanded={
                  menuProfilOuvert
                }
                aria-haspopup="menu"
                title="Profil"
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-lg
                  px-1.5
                  py-1
                  transition-colors
                  hover:bg-ink/5
                "
              >
                {/* Avatar */}

                <div
                  className="
                    flex
                    h-8
                    w-8
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
                        ) ??
                        undefined
                      }
                      alt={
                        utilisateur.nom
                      }
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <User size={15} />
                  )}
                </div>

                {/* NOM */}

                <div
                  className="
                    hidden
                    max-w-32
                    text-left
                    leading-tight
                    sm:block
                  "
                >
                  <p
                    className="
                      truncate
                      text-xs
                      font-medium
                      text-ink
                    "
                  >
                    {
                      utilisateur.nom
                    }
                  </p>

                  <p
                    className="
                      truncate
                      font-mono
                      text-[9px]
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

                <ChevronDown
                  size={13}
                  className={`
                    hidden
                    transition-transform
                    sm:block

                    ${
                      menuProfilOuvert
                        ? "rotate-180"
                        : ""
                    }
                  `}
                />
              </button>

              {/* ==================================================
                  MENU PROFIL
              ================================================== */}

              {menuProfilOuvert && (
                <div
                  role="menu"
                  className="
                    absolute
                    right-0
                    top-full
                    z-[100]
                    mt-2
                    w-56
                    overflow-hidden
                    rounded-xl
                    border
                    border-ink/10
                    bg-paper
                    shadow-xl
                  "
                >
                  {/* INFORMATIONS */}

                  <div
                    className="
                      border-b
                      border-ink/10
                      px-4
                      py-3
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
                      {
                        utilisateur.nom
                      }
                    </p>

                    <p
                      className="
                        truncate
                        text-xs
                        text-ink-soft
                      "
                    >
                      {
                        utilisateur.email
                      }
                    </p>

                    <p
                      className="
                        mt-1
                        font-mono
                        text-[9px]
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
                    onClick={
                      closeMenus
                    }
                    role="menuitem"
                    className="
                      flex
                      items-center
                      gap-3
                      px-4
                      py-2.5
                      text-sm
                      text-ink-soft
                      transition-colors
                      hover:bg-ink/5
                      hover:text-ink
                    "
                  >
                    <User
                      size={15}
                    />

                    <span>
                      Mon profil
                    </span>
                  </Link>

                  {/* DÉCONNEXION */}

                  <button
                    type="button"
                    onClick={logout}
                    role="menuitem"
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      border-t
                      border-ink/10
                      px-4
                      py-2.5
                      text-left
                      text-sm
                      text-brique
                      transition-colors
                      hover:bg-brique/5
                    "
                  >
                    <LogOut
                      size={15}
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
                flex
                items-center
                gap-2
              "
            >
              <Link href="/connexion">
                <Button
                  variant="ghost"
                  size="sm"
                >
                  Se connecter
                </Button>
              </Link>

              <Link href="/inscription">
                <Button
                  variant="primary"
                  size="sm"
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
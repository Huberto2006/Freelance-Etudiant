"use client";

import Link from "next/link";
import {
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  Search,
  Settings,
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

import {
  navigationParRole,
} from "@/lib/nav-links";

import { getFileUrl } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";
import { MessagesLink } from "@/components/ui/MessagesLink";
import { NotificationBell } from "@/components/ui/NotificationBell";

type NavbarProps = {
  /**
   * true lorsque le Navbar est utilisé
   * avec la Sidebar du dashboard.
   *
   * false pour les pages sans Sidebar.
   *
   * C'est le LAYOUT qui décide de cette
   * valeur, jamais le Navbar lui-même.
   */
  hasSidebar?: boolean;

  /**
   * Callback déclenché par le bouton
   * hamburger (mobile) lorsque hasSidebar
   * est true, pour ouvrir le drawer mobile
   * de la Sidebar.
   *
   * Ignoré si hasSidebar est false.
   */
  onMenuClick?: () => void;
};

export function Navbar({
  hasSidebar = false,
  onMenuClick,
}: NavbarProps) {
  const {
    utilisateur,
    deconnecter,
    chargement,
  } = useAuth();

  const [
    menuProfilOuvert,
    setMenuProfilOuvert,
  ] = useState(false);

  const navbarRef =
    useRef<HTMLElement>(null);

  /*
   * ==========================================================
   * NAVIGATION
   * ==========================================================
   */

  const groupes = utilisateur
    ? navigationParRole[
        utilisateur.role
      ] ?? []
    : [];

  /*
   * ==========================================================
   * PARAMÈTRES
   *
   * On récupère l'entrée existante dans
   * navigationParRole afin de ne pas
   * inventer une nouvelle route.
   * ==========================================================
   */

  const itemParametres =
    groupes.find(
      (item) =>
        item.label === "Paramètres",
    );

  /*
   * Les liens du menu Paramètres.
   *
   * La structure actuelle utilise "liens"
   * pour les éléments du groupe Paramètres.
   */
  const liensParametres =
    itemParametres?.liens ?? [];

  /*
   * Si Paramètres possède directement
   * un href sans sous-liens.
   */
  const hrefParametres =
    itemParametres?.href;

  /*
   * ==========================================================
   * FERMER LE MENU
   * ==========================================================
   */

  function closeMenus() {
    setMenuProfilOuvert(false);
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
      className={`
        fixed
        right-0
        top-0
        z-50
        h-16
        border-b
        border-ink/10
        bg-paper/95
        backdrop-blur-md
        transition-[left]
        duration-200
        ease-in-out

        ${
          hasSidebar
            ? "left-0 lg:left-[var(--sidebar-width)]"
            : "left-0"
        }
      `}
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
            SIDEBAR PRÉSENTE
            → bouton hamburger (mobile uniquement),
              la Sidebar reste responsable de l'identité.
        ==================================================== */}

        {hasSidebar && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu"
            title="Menu"
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
              lg:hidden
            "
          >
            <Menu size={20} />
          </button>
        )}

        {/* ====================================================
            SIDEBAR ABSENTE
            → LOGO KIANJA, visible à toutes les tailles d'écran.
            → réutilise le motif déjà utilisé par le projet
              (badge "K" + wordmark), tel que défini dans
              Sidebar.tsx, pour ne pas dupliquer l'identité
              visuelle.
        ==================================================== */}

        {!hasSidebar && (
          <Link
            href="/"
            className="
              flex
              items-center
              gap-2
              sm:gap-3
            "
            aria-label="Kianja"
          >
            <span
              className="
                flex
                h-8
                w-8
                shrink-0
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
                sm:h-9
                sm:w-9
                sm:text-xs
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
                text-ink
                sm:block
              "
            >
              Kianja
            </span>
          </Link>
        )}

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
                    SITE / ACCUEIL
                ============================================== */}

                <Link
                  href="/"
                  aria-label="Accueil"
                  title="Kianja"
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
                  "
                >
                  <Globe
                    size={19}
                    strokeWidth={2}
                  />
                </Link>

                {/* ==============================================
                    MESSAGES
                ============================================== */}

                <MessagesLink />

                {/* ==============================================
                    NOTIFICATIONS
                ============================================== */}

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
                {/* ==================================================
                    AVATAR
                ================================================== */}

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
                        ) ?? undefined
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

                {/* ==================================================
                    NOM
                ================================================== */}

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
                    {utilisateur.nom}
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
                    w-64
                    overflow-hidden
                    rounded-xl
                    border
                    border-ink/10
                    bg-paper
                    shadow-xl
                  "
                >
                  {/* ==============================================
                      INFORMATIONS UTILISATEUR
                  ============================================== */}

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

                  {/* ==============================================
                      MON PROFIL
                  ============================================== */}

                  <Link
                    href="/tableau-de-bord/profil"
                    onClick={closeMenus}
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
                    <User size={15} />

                    <span>
                      Mon profil
                    </span>
                  </Link>

                  {/* ==============================================
                      PARAMÈTRES
                  ============================================== */}

                  {liensParametres.length >
                    0 ? (
                    liensParametres.map(
                      (link) => {
                        if (!link.href) {
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
                              flex
                              items-center
                              gap-3
                              border-t
                              border-ink/10
                              px-4
                              py-2.5
                              text-sm
                              text-ink-soft
                              transition-colors
                              hover:bg-ink/5
                              hover:text-ink
                            "
                          >
                            <Settings
                              size={15}
                            />

                            <span>
                              {link.label}
                            </span>
                          </Link>
                        );
                      },
                    )
                  ) : hrefParametres ? (
                    <Link
                      href={
                        hrefParametres
                      }
                      onClick={
                        closeMenus
                      }
                      role="menuitem"
                      className="
                        flex
                        items-center
                        gap-3
                        border-t
                        border-ink/10
                        px-4
                        py-2.5
                        text-sm
                        text-ink-soft
                        transition-colors
                        hover:bg-ink/5
                        hover:text-ink
                      "
                    >
                      <Settings
                        size={15}
                      />

                      <span>
                        Paramètres
                      </span>
                    </Link>
                  ) : null}

                  {/* ==============================================
                      APPARENCE
                  ============================================== */}

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

                  {/* ==============================================
                      DÉCONNEXION
                  ============================================== */}

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
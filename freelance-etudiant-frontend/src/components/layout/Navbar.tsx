"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from "lucide-react";

import { useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth-context";
import { useLabels } from "@/i18n/use-labels";
import { useNavLabel } from "@/i18n/use-nav-label";
import { navigationParRole } from "@/lib/nav-links";
import { getFileUrl } from "@/lib/api";

import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";
import { SelecteurLangue } from "@/components/ui/SelecteurLangue";
import { MessagesLink } from "@/components/ui/MessagesLink";
import { NotificationBell } from "@/components/ui/NotificationBell";

type NavbarProps = {
  /**
   * true lorsque le Navbar est utilisé
   * avec la Sidebar du dashboard.
   */
  hasSidebar?: boolean;

  /**
   * Ouvre la Sidebar mobile.
   */
  onMenuClick?: () => void;
};

export function Navbar({
  hasSidebar = false,
  onMenuClick,
}: NavbarProps) {
  const t = useTranslations("navigation.dashboardNav");
  const tn = useNavLabel().label;
  const libelleRole = useLabels().role;
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

  const navbarRef =
    useRef<HTMLElement>(null);

  /*
   * ==========================================================
   * ESPACE ACTUEL
   * ==========================================================
   */

  const estDansDashboard =
    pathname === "/tableau-de-bord" ||
    pathname.startsWith(
      "/tableau-de-bord/",
    );

  /*
   * ==========================================================
   * PAGES SANS NAVBAR
   * ==========================================================
   */

  const estPageAuth = [
    "/connexion",
    "/inscription",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/verification-email",
  ].includes(pathname);

  /*
   * ==========================================================
   * BASCULE SITE / DASHBOARD
   * ==========================================================
   */

  const hrefBascule =
    estDansDashboard
      ? "/"
      : "/tableau-de-bord";

  const labelBascule =
    estDansDashboard
      ? t("backToSite")
      : tn("Tableau de bord");

  /*
   * ==========================================================
   * NAVIGATION PAR RÔLE
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
   * ==========================================================
   */

  const itemParametres =
    groupes.find(
      (item) =>
        item.label === "Paramètres",
    );

  const liensParametres =
    (itemParametres?.liens ?? []).filter(
      (link) =>
        ![
          "Paiements",
          "Factures",
          "Favoris",
        ].includes(link.label),
    );

  const hrefParametres =
    itemParametres?.href;

  /*
   * ==========================================================
   * FERMER LES MENUS
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
   * PAGES AUTHENTIFICATION
   * ==========================================================
   */

  if (estPageAuth) {
    return null;
  }

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
        top-0
        right-0
        z-50
        h-16
        border-b
        border-ink/10
        bg-paper-light/95
        shadow-[0_2px_12px_rgba(15,23,42,0.06)]
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
            MENU MOBILE
            ==================================================== */}

        {hasSidebar && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={t("openMenu")}
            title={t("menu")}
            className="
              flex
              h-9
              w-9
              shrink-0
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
            LOGO
            ==================================================== */}

        {!hasSidebar && (
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
              sm:gap-3
            "
            aria-label="Kianja"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-kianja.png"
              alt={t("logoAlt")}
              className="
                h-10
                w-10
                shrink-0
                rounded-xl
                border
                border-ink/10
                bg-white
                object-contain
                p-1
                shadow-xs
                sm:h-11
                sm:w-11
              "
            />
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
            min-w-0
            items-center
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
                aria-hidden="true"
              />

              <input
                type="search"
                name="q"
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchService")}
                className="
                  kianja-field-control
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
                  transition-colors
                  placeholder:text-ink-soft/45
                  hover:border-ink/25
                  focus:border-ink/40
                "
              />
            </div>
          </form>

          {/* ==================================================
              GROUPE DES ACTIONS
              ================================================== */}

          <div
            className="
              flex
              items-center
              gap-0.5
              sm:gap-1
            "
          >
            {/* ==============================================
                RECHERCHE MOBILE
                ============================================== */}

            <Link
              href="/services"
              aria-label={t("search")}
              title={t("search")}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                text-ink-soft
                transition-colors
                hover:bg-ink/5
                hover:text-ink
                md:hidden
              "
            >
              <Search size={18} />
            </Link>

            {/* ==============================================
                MODE SOMBRE
                ACCESSIBLE À TOUS
                ============================================== */}

            <SelecteurLangue />

            <BasculeTheme />

            {/* ==============================================
                UTILISATEUR CONNECTÉ
                ============================================== */}

            {!chargement &&
              utilisateur && (
                <>
                  {/* ==========================================
                      BASCULE SITE / DASHBOARD
                      ========================================== */}

                  <Link
                    href={hrefBascule}
                    aria-label={labelBascule}
                    title={labelBascule}
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      text-ink-soft
                      transition-colors
                      hover:bg-ink/5
                      hover:text-ink
                    "
                  >
                    {estDansDashboard ? (
                      <Globe
                        size={19}
                        strokeWidth={2}
                      />
                    ) : (
                      <LayoutDashboard
                        size={19}
                        strokeWidth={2}
                      />
                    )}
                  </Link>

                  {/* ==========================================
                      MESSAGES
                      ========================================== */}

                  <MessagesLink />

                  {/* ==========================================
                      NOTIFICATIONS
                      ========================================== */}

                  <NotificationBell />

                  {/* ==========================================
                      SÉPARATEUR
                      ========================================== */}

                  <div
                    className="
                      mx-1.5
                      h-6
                      w-px
                      shrink-0
                      bg-ink/10
                      sm:mx-2
                    "
                    aria-hidden="true"
                  />
                </>
              )}

            {/* ==================================================
                PROFIL
                ================================================== */}

            {chargement ? null : utilisateur ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMenuProfilOuvert(
                      (value) =>
                        !value,
                    );
                  }}
                  aria-label={t("profileMenu")}
                  aria-expanded={
                    menuProfilOuvert
                  }
                  aria-haspopup="menu"
                  title={t("profile")}
                  className="
                    flex
                    h-9
                    items-center
                    gap-2
                    rounded-lg
                    px-2
                    transition-colors
                    hover:bg-ink/5
                  "
                >
                  {/* ==========================================
                      AVATAR
                      ========================================== */}

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
                      border
                      border-ink/15
                      bg-ink/5
                      text-ink-soft
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

                  {/* ==========================================
                      NOM
                      ========================================== */}

                  <div
                    className="
                      hidden
                      max-w-36
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
                        text-[0.625rem]
                        uppercase
                        tracking-wider
                        text-ink-soft/60
                      "
                    >
                      {libelleRole(utilisateur.role)}
                    </p>
                  </div>

                  <ChevronDown
                    size={13}
                    className={`
                      hidden
                      text-ink-soft/70
                      transition-transform
                      duration-150
                      sm:block

                      ${
                        menuProfilOuvert
                          ? "rotate-180 text-ink"
                          : ""
                      }
                    `}
                  />
                </button>

                {/* ==============================================
                    MENU PROFIL
                    ============================================== */}

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
                      bg-paper-light
                      shadow-lg
                    "
                  >
                    {/* ==========================================
                        INFORMATIONS UTILISATEUR
                        ========================================== */}

                    <div
                      className="
                        border-b
                        border-ink/10
                        bg-ink/[0.02]
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
                          text-[0.625rem]
                          uppercase
                          tracking-wider
                          text-ink-soft/60
                        "
                      >
                        {libelleRole(utilisateur.role)}
                      </p>
                    </div>

                    {/* ==========================================
                        MON PROFIL
                        ========================================== */}

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
                        {tn("Mon profil")}
                      </span>
                    </Link>

                    {/* ==========================================
                        PARAMÈTRES
                        ========================================== */}

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
                                {tn(link.label)}
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
                          {tn("Paramètres")}
                        </span>
                      </Link>
                    ) : null}

                    {/* ==========================================
                        DÉCONNEXION
                        ========================================== */}

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
                        {t("logout")}
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
                    {t("login")}
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
      </div>
    </header>
  );
}
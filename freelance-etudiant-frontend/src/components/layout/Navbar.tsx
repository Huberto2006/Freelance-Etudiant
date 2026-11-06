
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ChevronDown,
  House,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  Globe,
  User,
  UserPlus,
  CircleHelp,
  UserRoundCog,
} from "lucide-react";

import { useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth-context";
import { useLabels } from "@/i18n/use-labels";
import { useNavLabel } from "@/i18n/use-nav-label";
import { navigationParRole } from "@/lib/nav-links";
import { getFileUrl } from "@/lib/api";

import { BasculeTheme } from "@/features/theme/components/BasculeTheme";
import { SelecteurLangue } from "@/components/layout/SelecteurLangue";
import { MessagesLink } from "@/features/messagerie/components/MessagesLink";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

type NavbarProps = {
  hasSidebar?: boolean;
  onMenuClick?: () => void;
};

const menuItemStyles = `
  flex w-full items-center gap-3
  px-4 py-2.5
  text-sm font-medium
  text-ink
  transition-colors duration-150
  hover:bg-ink/5
`;

const menuSectionStyles = `
 px-4 pt-3 pb-1
 text-[10px] font-semibold

 text-ink-soft/85
`;

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

  const [menuProfilOuvert, setMenuProfilOuvert] =
    useState(false);

  const navbarRef = useRef<HTMLElement>(null);

  /*
   * ==========================================================
   * ESPACE ACTUEL
   * ==========================================================
   */

  const estDansDashboard =
    pathname === "/tableau-de-bord" ||
    pathname.startsWith("/tableau-de-bord/");

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

  const hrefBascule = estDansDashboard
    ? "/"
    : "/tableau-de-bord";

  const labelBascule = estDansDashboard
    ? t("backToSite")
    : tn("Tableau de bord");

  /*
   * ==========================================================
   * NAVIGATION PAR RÔLE
   * ==========================================================
   */

  const groupes = utilisateur
    ? navigationParRole[utilisateur.role] ?? []
    : [];

  /*
   * ==========================================================
   * PARAMÈTRES DU COMPTE
   * ==========================================================
   */

  const itemParametres = groupes.find(
    (item) => item.label === "Paramètres",
  );

  const liensParametres = (
    itemParametres?.liens ?? []
  ).filter(
    (link) =>
      !["Paiements", "Factures"].includes(link.label),
  );

  /*
   * ==========================================================
   * FERMETURE DES MENUS
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
    function handleClickOutside(event: MouseEvent) {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(event.target as Node)
      ) {
        closeMenus();
      }
    }

    function handleKeyboard(event: KeyboardEvent) {
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
   * FERMER LE MENU LORS DU CHANGEMENT DE PAGE
   * ==========================================================
   */

  useEffect(() => {
    closeMenus();
  }, [pathname]);

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
        bg-paper-light
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
              flex h-9 w-9 shrink-0
              items-center justify-center
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
            href={utilisateur ? "/tableau-de-bord" : "/"}
            className="flex items-center gap-2 sm:gap-3"
            aria-label="Kianja"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-kianja.png"
              alt={t("logoAlt")}
              className="
                h-10 w-10 shrink-0
                rounded-xl
                border border-ink/10
                bg-white
                object-contain
                p-1
                shadow-xs
                sm:h-11 sm:w-11
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

        <div className="flex min-w-0 items-center">

          {/* ==================================================
              RECHERCHE DESKTOP
              ================================================== */}

          <form
            action="/services"
            role="search"
            className="mr-2 hidden md:block"
          >
            <div className="relative w-52 lg:w-64 xl:w-72">
              <Search
                size={16}
                className="
                  pointer-events-none
                  absolute left-3 top-1/2
                  -translate-y-1/2
                  text-ink-soft/85
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
                  h-9 w-full
                  rounded-full
                  border border-ink/15
                  bg-paper-light
                  pl-9 pr-3
                  text-xs text-ink
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

          <div className="flex items-center gap-0.5 sm:gap-1">

            {/* ==============================================
                RECHERCHE MOBILE
                ============================================== */}

            <Link
              href="/services"
              aria-label={t("search")}
              title={t("search")}
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
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
                ACTIONS RÉSERVÉES AU DASHBOARD
                ============================================== */}

            {!chargement &&
              utilisateur &&
              estDansDashboard && (
                <>
                  <BasculeTheme />

                  <MessagesLink />

                  <NotificationBell />
                </>
              )}

            {/* ==============================================
                BASCULE SITE / DASHBOARD
                ============================================== */}

            {!chargement && utilisateur && (
              <Link
                href={hrefBascule}
                aria-label={labelBascule}
                title={labelBascule}
                className="
                  flex h-9 w-9 shrink-0
                  items-center justify-center
                  rounded-lg
                  text-ink-soft
                  transition-colors
                  hover:bg-ink/5
                  hover:text-ink
                "
              >
                {estDansDashboard ? (
                  <House size={20} strokeWidth={2} />
                ) : (
                  <LayoutDashboard
                    size={20}
                    strokeWidth={2}
                  />
                )}
              </Link>
            )}

            {/* ==============================================
                SÉPARATEUR
                ============================================== */}

            {!chargement && utilisateur && (
              <div
                className="
                  mx-1.5 h-6 w-px shrink-0
                  bg-ink/10 sm:mx-2
                "
                aria-hidden="true"
              />
            )}

            {/* ==================================================
                MENU PERSONNE / PROFIL
                ================================================== */}

            {!chargement && (
              <div className="relative shrink-0">

                {/* ==========================================
                    BOUTON PERSONNE
                    ========================================== */}

                <button
                  type="button"
                  onClick={() =>
                    setMenuProfilOuvert((value) => !value)
                  }
                  aria-label={utilisateur
                    ? t("profileMenu")
                    : tn("Menu utilisateur")}
                  aria-expanded={menuProfilOuvert}
                  aria-haspopup="menu"
                  title={utilisateur
                    ? t("profile")
                    : tn("Mon compte")}
                  className={`
                    flex h-10 items-center
                    gap-2 rounded-full
                    border border-ink/10
                    px-2
                    transition-colors
                    hover:bg-ink/5
                    ${
                      menuProfilOuvert
                        ? "bg-ink/5"
                        : "bg-transparent"
                    }
                    ${
                      utilisateur
                        ? "sm:rounded-lg"
                        : "w-10 justify-center rounded-full"
                    }
                  `}
 >

 {/* AVATAR */}

 <div
 className="
 flex h-8 w-8 shrink-0
 items-center justify-center
 overflow-hidden
 rounded-full
 border border-ink/10
 bg-ink/5
 text-ink-soft
 "
 >
 {utilisateur?.photoUrl ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={
 getFileUrl(utilisateur.photoUrl) ??
 undefined
 }
 alt={utilisateur.nom}
 className="h-full w-full object-cover"
 />
 ) : (
 <User size={20} strokeWidth={1.8} />
 )}
 </div>

 {/* NOM UTILISATEUR */}

 {utilisateur && (
 <div className="hidden max-w-36 text-left leading-tight sm:block">
 <p className="truncate text-xs font-medium text-ink">
 {utilisateur.nom}
 </p>

 <p className="
 truncate

 text-xs


 text-ink-soft/85
 ">
 {libelleRole(utilisateur.role)}
 </p>
 </div>
 )}

 <ChevronDown
 size={14}
 className={`
                      shrink-0
                      text-ink-soft/85
                      transition-transform
                      duration-150
                      ${
                        menuProfilOuvert
                          ? "rotate-180 text-ink"
                          : ""
                      }
                    `}
                  />
                </button>

                {/* ==================================================
                    MENU VISITEUR NON CONNECTÉ
                    ================================================== */}

                {menuProfilOuvert && !utilisateur && (
                  <div
                    role="menu"
                    className="
                      animate-pop
                      absolute right-0 top-full z-[100]
                      mt-2 w-64
                      origin-top-right
                      overflow-hidden
                      rounded-xl
                      border border-ink/10
                      bg-paper-light
                      shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)]
                    "
                  >

                    {/* CONNEXION */}

                    <Link
                      href="/connexion"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <LogIn size={16} />
                      <span>{t("login")}</span>
                    </Link>

                    {/* INSCRIPTION */}

                    <Link
                      href="/inscription"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <UserPlus size={16} />
                      <span>{tn("Inscription")}</span>
                    </Link>

                    <div className="my-1 border-t border-ink/10" />

                    {/* CENTRE D'AIDE */}

                    <Link
                      href="/aide-et-faq"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <CircleHelp size={16} />
                      <span>{tn("Centre d'aide")}</span>
                    </Link>

                    {/* À PROPOS */}

                    <Link
                      href="/a-propos"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <Info size={16} />
                      <span>{tn("À propos")}</span>
                    </Link>

                    <div className="my-1 border-t border-ink/10" />

                    {/* PRÉFÉRENCES */}

                    <p className={menuSectionStyles}>
                      {tn("Préférences")}
                    </p>

                    <div className="
                      flex items-center gap-3
                      px-4 py-3
                      text-sm text-ink
                    ">
                      <Globe
                        size={16}
                        className="shrink-0 text-ink-soft"
                      />

                      <div className="min-w-0 flex-1">
                        <SelecteurLangue />
                      </div>
                    </div>
                  </div>
                )}

                {/* ==================================================
                    MENU UTILISATEUR CONNECTÉ
                    ================================================== */}

                {menuProfilOuvert && utilisateur && (
                  <div
                    role="menu"
                    className="
                      animate-pop
                      absolute right-0 top-full z-[100]
                      mt-2 w-64
                      origin-top-right
                      overflow-hidden
                      rounded-xl
                      border border-ink/10
                      bg-paper-light
                      shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)]
                    "
                  >

                    {/* ==========================================
                        MON PROFIL
                        ========================================== */}

                    <Link
                      href="/tableau-de-bord/profil"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <User size={16} />
                      <span>{tn("Mon profil")}</span>
                    </Link>

                    {/* CENTRE D'AIDE */}

                    <Link
                      href="/aide-et-faq"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <CircleHelp size={16} />
                      <span>{tn("Centre d'aide")}</span>
                    </Link>

                    <div className="my-1 border-t border-ink/10" />

                    {/* ==========================================
                        SECTION MON COMPTE
                        ========================================== */}

                    <p className={menuSectionStyles}>
                      {tn("Mon compte")}
                    </p>

                    <Link
                      href="/tableau-de-bord/profil"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <UserRoundCog size={16} />
                      <span>{tn("Mon compte")}</span>
                    </Link>

                    {/* PARAMÈTRES PAR RÔLE */}

                    {liensParametres.map((link) => {
                      if (!link.href) {
                        return null;
                      }

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={closeMenus}
                          role="menuitem"
                          className={menuItemStyles}
                        >
                          <Settings size={16} />
                          <span>{tn(link.label)}</span>
                        </Link>
                      );
                    })}

                    {/* ==========================================
                        SECTION PRÉFÉRENCES
                        ========================================== */}

                    <div className="my-1 border-t border-ink/10" />

                    <p className={menuSectionStyles}>
                      {tn("Préférences")}
                    </p>

                    <div className="
                      flex items-center gap-3
                      px-4 py-3
                      text-sm text-ink
                    ">
                      <Globe
                        size={16}
                        className="shrink-0 text-ink-soft"
                      />

                      <div className="min-w-0 flex-1">
                        <SelecteurLangue />
                      </div>
                    </div>

                    {/* À PROPOS */}

                    <Link
                      href="/a-propos"
                      onClick={closeMenus}
                      role="menuitem"
                      className={menuItemStyles}
                    >
                      <Info size={16} />
                      <span>{tn("À propos")}</span>
                    </Link>

                    {/* ==========================================
                        DÉCONNEXION
                        ========================================== */}

                    <div className="border-t border-ink/10" />

                    <button
                      type="button"
                      onClick={logout}
                      role="menuitem"
                      className="
                        flex w-full items-center gap-3
                        px-4 py-3
                        text-left text-sm font-medium
                        text-brique
                        transition-colors
                        hover:bg-brique/5
                      "
                    >
                      <LogOut size={16} />
                      <span>{t("logout")}</span>
                    </button>

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BriefcaseBusiness,
  ShoppingBag,
  Layers3,
  ClipboardList,
  Package,
  Wallet,
  Star,
  User,
  Users,
  UserRoundPlus,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  useAuth,
  roleLabel,
} from "@/lib/auth-context";

import {
  navigationParRole,
} from "@/lib/nav-links";

import { getFileUrl } from "@/lib/api";

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const SIDEBAR_OPEN_WIDTH = "260px";
const SIDEBAR_CLOSED_WIDTH = "76px";

const ICONS: Record<
  string,
  React.ElementType
> = {
  "Tableau de bord": Home,
  Dashboard: Home,

  Missions: BriefcaseBusiness,

  Services: ShoppingBag,

  "Mes publications": Layers3,

  Candidatures: ClipboardList,
  "Mes candidatures": ClipboardList,

  Groupes: Users,

  Amis: UserRoundPlus,

  "Demandes de service": ClipboardList,

  Livraisons: Package,
  "Mes livraisons": Package,

  Paiements: Wallet,
  "Mes paiements": Wallet,

  Évaluations: Star,
  Evaluations: Star,
  "Mes évaluations": Star,

  Profil: User,
  "Mon profil": User,

  Favoris: Star,

  Paramètres: Settings,
};

function getIcon(label: string) {
  return (
    ICONS[label] ??
    BriefcaseBusiness
  );
}

function isActive(
  pathname: string,
  href: string,
) {
  if (pathname === href) {
    return true;
  }

  if (
    href === "/tableau-de-bord"
  ) {
    return false;
  }

  return pathname.startsWith(
    `${href}/`,
  );
}

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const {
    utilisateur,
    deconnecter,
    chargement,
  } = useAuth();

  const pathname =
    usePathname();

  const [collapsed, setCollapsed] =
    useState(false);

  /*
   * ==========================================================
   * SYNCHRONISATION DE LA LARGEUR
   * ==========================================================
   */

  useEffect(() => {
    const width = collapsed
      ? SIDEBAR_CLOSED_WIDTH
      : SIDEBAR_OPEN_WIDTH;

    document.documentElement.style.setProperty(
      "--sidebar-width",
      width,
    );

    return () => {
      document.documentElement.style.removeProperty(
        "--sidebar-width",
      );
    };
  }, [collapsed]);

  /*
   * ==========================================================
   * ESCAPE — MOBILE
   * ==========================================================
   */

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function handleKeyboard(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onMobileClose?.();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyboard,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyboard,
      );
    };
  }, [
    mobileOpen,
    onMobileClose,
  ]);

  /*
   * ==========================================================
   * CHARGEMENT AUTHENTIFICATION
   * ==========================================================
   */

  if (
    chargement ||
    !utilisateur
  ) {
    return null;
  }

  /*
   * ==========================================================
   * NAVIGATION SELON LE RÔLE
   * ==========================================================
   */

  const navigation =
    navigationParRole[
      utilisateur.role
    ] ?? [];

  /*
   * ==========================================================
   * ÉLÉMENTS GÉRÉS PAR LE NAVBAR
   * ==========================================================
   */

  const navigationSidebar =
    navigation.filter(
      (item) =>
        ![
          "Messages",
          "Notifications",
        ].includes(item.label),
    );

  /*
   * ==========================================================
   * TABLEAU DE BORD
   * ==========================================================
   */

  const dashboard =
    navigationSidebar.find(
      (item) =>
        item.href ===
          "/tableau-de-bord" ||
        item.label ===
          "Tableau de bord" ||
        item.label ===
          "Dashboard",
    );

  /*
   * ==========================================================
   * AUTRES ITEMS
   * ==========================================================
   */

  const autresItems =
    navigationSidebar.filter(
      (item) =>
        item !== dashboard,
    );

  const parametres =
    autresItems.find(
      (item) => item.label === "Paramètres",
    );

  /*
   * Le profil est toujours affiché
   * dans la partie inférieure.
   */

  const items =
    autresItems.filter(
      (item) =>
        item.label !== "Profil" &&
        item.label !== "Mon profil" &&
        item.label !== "Paramètres",
    );

  /*
   * ==========================================================
   * SECTIONS
   * ==========================================================
   */

  const trouverLabels = [
    "Publications",
    "Missions",
    "Services",
    "Explorer",
  ];

  const activiteLabels = [
    "Mes publications",
    "Mes services",
    "Mes missions",
    "Mes candidatures",
    "Candidatures",
    "Demandes de service",
    "Livraisons",
    "Mes livraisons",
    "Paiements",
    "Mes paiements",
    "Évaluations",
    "Mes évaluations",
    "Evaluations",
  ];

  const communauteLabels = [
    "Groupes",
    "Amis",
    "Favoris",
  ];

  const trouver = items.filter((item) =>
    trouverLabels.includes(item.label),
  );

  const activite = items.filter((item) =>
    activiteLabels.includes(item.label),
  );

  const communaute = items.filter((item) =>
    communauteLabels.includes(item.label),
  );

  const principal = [
    ...(dashboard ? [dashboard] : []),
    ...items.filter(
      (item) =>
        !trouverLabels.includes(item.label) &&
        !activiteLabels.includes(item.label) &&
        !communauteLabels.includes(item.label),
    ),
  ];

  /*
   * ==========================================================
   * ACTIONS
   * ==========================================================
   */

  function closeMobile() {
    onMobileClose?.();
  }

  function logout() {
    closeMobile();
    deconnecter();
  }

  /*
   * ==========================================================
   * RENDRE UN ITEM
   * ==========================================================
   */

  function renderItem(
    item: (typeof navigationSidebar)[number],
  ) {
    const Icon =
      getIcon(item.label);

    /*
     * ========================================================
     * GROUPE AVEC SOUS-LIENS
     * ========================================================
     */

    if (
      item.liens &&
      item.liens.length > 0
    ) {
      return (
        <div
          key={item.label}
          className="space-y-1"
        >
          {!collapsed ? (
            <div
              className="
                flex
                items-center
                gap-2
                px-3
                pb-2
                pt-2
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-white/45
              "
            >
              <Icon size={13} strokeWidth={2} />
              <span>{item.label}</span>
            </div>
          ) : (
            <div
              className="
                flex
                justify-center
                pb-1
                text-white/45
              "
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={16} strokeWidth={2} />
            </div>
          )}

          {item.liens.map(
            (link) => {
              const active =
                isActive(
                  pathname,
                  link.href,
                );

              const LinkIcon =
                getIcon(
                  link.label,
                );

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={
                    closeMobile
                  }
                  title={
                    collapsed
                      ? link.label
                      : undefined
                  }
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  className={`
                    group
                    flex
                    min-h-10
                    items-center
                    gap-3
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                    font-medium
                    transition-all
                    duration-150

                    ${
                      collapsed
                        ? "justify-center"
                        : ""
                    }

                    ${
                      active
                        ? "bg-bleu text-white dark:text-slate-900 shadow-sm"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <LinkIcon
                    size={18}
                    strokeWidth={
                      active
                        ? 2.4
                        : 2
                    }
                    className="shrink-0"
                  />

                  {!collapsed && (
                    <span className="truncate pl-1">
                      {
                        link.label
                      }
                    </span>
                  )}
                </Link>
              );
            },
          )}
        </div>
      );
    }

    /*
     * ========================================================
     * LIEN SIMPLE
     * ========================================================
     */

    if (!item.href) {
      return null;
    }

    const active =
      isActive(
        pathname,
        item.href,
      );

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeMobile}
        title={
          collapsed
            ? item.label
            : undefined
        }
        aria-current={
          active
            ? "page"
            : undefined
        }
        className={`
          group
          flex
          items-center
          gap-3
          rounded-lg
          px-3
          py-2
          text-sm
          font-medium
          transition-all
          duration-150

          ${
            collapsed
              ? "justify-center"
              : ""
          }

          ${
            active
              ? "bg-bleu text-white dark:text-slate-900 shadow-sm"
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        <Icon
          size={18}
          strokeWidth={
            active
              ? 2.4
              : 2
          }
          className="shrink-0"
        />

        {!collapsed && (
          <span className="truncate">
            {item.label}
          </span>
        )}
      </Link>
    );
  }

  /*
   * ==========================================================
   * RENDRE UNE SECTION
   * ==========================================================
   */

  function renderSection(
    title: string,
    sectionItems:
      typeof navigationSidebar,
  ) {
    if (
      sectionItems.length === 0
    ) {
      return null;
    }

    return (
      <div className="mb-6">
        {!collapsed && (
          <p
            className="
              px-3
              pb-2.5
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-white/45
            "
          >
            {title}
          </p>
        )}

        <div className="space-y-1">
          {sectionItems.map(
            renderItem,
          )}
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * CONTENU SIDEBAR
   * ==========================================================
   */

  const sidebarContent = (
    <aside
      className={`
        flex
        h-full
        flex-col
        border-r
        border-white/10
        bg-panel
        transition-[width]
        duration-200
        ease-in-out

        ${
          collapsed
            ? "w-[76px]"
            : "w-[260px]"
        }
      `}
    >
      {/* =====================================================
          LOGO
          ===================================================== */}

      <div
        className={`
          flex
          h-16
          shrink-0
          items-center
          border-b
          border-white/10

          ${
            collapsed
              ? "justify-center"
              : "justify-between px-5"
          }
        `}
      >
        <Link
          href="/tableau-de-bord"
          onClick={closeMobile}
          className="
            flex
            items-center
            gap-3
          "
          aria-label="Kianja"
        >
          <img
            src="/images/logo-kianja.png"
            alt="Logo Kianja"
            className="
              h-9
              w-9
              shrink-0
              rounded-xl
              border
              border-white/15
              bg-white
              object-contain
              p-1
              shadow-sm
            "
          />

          {!collapsed && (
            <span className="leading-tight text-white">
              <span className="block text-base font-semibold tracking-tight">
                Kianja
              </span>
              <span className="block text-[9px] text-white/55">
                Freelances étudiants
              </span>
            </span>
          )}

        </Link>

        {/* Bouton réduire */}

        {!collapsed && (
          <button
            type="button"
            onClick={() =>
              setCollapsed(true)
            }
            aria-label="Réduire la barre latérale"
            title="Réduire le menu"
            className="
              hidden
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-white/70
              transition
              hover:bg-white/10
              hover:text-white
              lg:flex
            "
          >
            <ChevronLeft
              size={17}
            />
          </button>
        )}
      </div>

      {/* =====================================================
          NAVIGATION
          ===================================================== */}

      <nav
        aria-label="Navigation principale"
        className="
          flex-1
          min-h-0
          overflow-y-auto
          px-3
          py-4
        "
      >
        {/* Principal */}

        {renderSection(
          "PRINCIPAL",
          principal,
        )}

        {!collapsed && (
          <div className="mb-5 h-px bg-white/10" />
        )}

        {renderSection(
          "TROUVER",
          trouver,
        )}

        {/* Mon activité */}

        {renderSection(
          "MON ACTIVITÉ",
          activite,
        )}

        {/* Communauté */}

        {renderSection(
          "COMMUNAUTÉ",
          communaute,
        )}

        {parametres && (
          <div className="mb-6">
            {renderItem(parametres)}
          </div>
        )}

      </nav>

      {/* =====================================================
          BAS SIDEBAR
          ===================================================== */}

      <div
        className="
          shrink-0
          border-t
          border-white/10
          bg-panel-dark
          p-3
        "
      >
        {/* Profil */}

        <Link
          href="/tableau-de-bord/profil"
          onClick={closeMobile}
          title={
            collapsed
              ? "Mon profil"
              : undefined
          }
          className={`
            mb-1
            flex
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            transition-colors

            ${
              collapsed
                ? "justify-center"
                : ""
            }

            ${
              isActive(
                pathname,
                "/tableau-de-bord/profil",
              )
                ? "bg-bleu text-white dark:text-slate-900"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          <span
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-full
              bg-white/10
              text-white/80
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
                alt={utilisateur.nom}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} />
            )}
          </span>

          {!collapsed && (
            <span className="min-w-0 truncate">
              <span className="block truncate">
                Mon profil
              </span>
              <span className="block truncate text-[10px] font-normal text-white/50">
                {utilisateur.nom}
              </span>
            </span>
          )}
        </Link>

        {/* Déconnexion */}

        <button
          type="button"
          onClick={logout}
          title={
            collapsed
              ? "Se déconnecter"
              : undefined
          }
          className={`
            flex
            w-full
            items-center
            gap-3
            rounded-lg
            px-3
            py-2
            text-sm
            font-medium
            text-white/75
            transition-colors
            hover:bg-white/10

            ${
              collapsed
                ? "justify-center"
                : ""
            }
          `}
        >
          <LogOut
            size={18}
            className="shrink-0"
          />

          {!collapsed && (
            <span>
              Se déconnecter
            </span>
          )}
        </button>
      </div>
    </aside>
  );

  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <>
      {/* =====================================================
          DESKTOP
          ===================================================== */}

      <div
        className="
          fixed
          left-0
          top-0
          z-[60]
          hidden
          h-screen
          lg:block
        "
        style={{
          width:
            "var(--sidebar-width)",
        }}
      >
        {sidebarContent}

        {/* ===================================================
            BOUTON ROUVRIR
            =================================================== */}

        {collapsed && (
          <button
            type="button"
            onClick={() =>
              setCollapsed(false)
            }
            aria-label="Ouvrir la barre latérale"
            title="Ouvrir le menu"
            className="
              absolute
              right-[-14px]
              top-1/2
              flex
              h-8
              w-8
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-ink/10
              bg-paper
              text-ink-soft
              shadow-md
              transition-all
              duration-150
              hover:scale-105
              hover:bg-ink
              hover:text-paper-light
            "
          >
            <ChevronRight
              size={16}
            />
          </button>
        )}
      </div>

      {/* =====================================================
          MOBILE
          ===================================================== */}

      {mobileOpen && (
        <div
          className="
            fixed
            inset-0
            z-[70]
            lg:hidden
          "
        >
          {/* Overlay */}

          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={closeMobile}
            className="
              absolute
              inset-0
              bg-ink/30
              backdrop-blur-sm
            "
          />

          {/* Sidebar mobile */}

          <div
            className="
              relative
              z-[71]
              h-full
              w-[260px]
            "
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
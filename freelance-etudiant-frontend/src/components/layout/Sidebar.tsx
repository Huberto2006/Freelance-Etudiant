"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BriefcaseBusiness,
  ShoppingBag,
  ClipboardList,
  Package,
  Wallet,
  Star,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  useAuth,
  roleLabel,
} from "@/lib/auth-context";

import {
  navigationParRole,
} from "@/lib/nav-links";

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

  Candidatures: ClipboardList,
  "Mes candidatures": ClipboardList,

  Livraisons: Package,
  "Mes livraisons": Package,

  Paiements: Wallet,
  "Mes paiements": Wallet,

  Évaluations: Star,
  Evaluations: Star,
  "Mes évaluations": Star,

  Profil: User,
  "Mon profil": User,
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
    href ===
    "/tableau-de-bord"
  ) {
    return false;
  }

  return pathname.startsWith(
    `${href}/`,
  );
}

function getSection(
  label: string,
) {
  const value =
    label.toLowerCase();

  if (
    value.includes("mission") ||
    value.includes("service") ||
    value.includes("explorer")
  ) {
    return "TROUVER";
  }

  if (
    value.includes("candidature") ||
    value.includes("livraison") ||
    value.includes("paiement")
  ) {
    return "MON ACTIVITÉ";
  }

  if (
    value.includes("évaluation") ||
    value.includes("evaluation") ||
    value.includes("commentaire")
  ) {
    return "COMMUNAUTÉ";
  }

  return "PRINCIPAL";
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
      document.documentElement.style.setProperty(
        "--sidebar-width",
        SIDEBAR_OPEN_WIDTH,
      );
    };
  }, [collapsed]);

  /*
   * ==========================================================
   * CHARGEMENT
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
   * NAVIGATION
   * ==========================================================
   */

  const navigation =
    navigationParRole[
      utilisateur.role
    ] ?? [];

  /*
   * Les éléments suivants sont
   * gérés par la Navbar.
   */

  const navigationSidebar =
    navigation.filter(
      (item) =>
        ![
          "Messages",
          "Notifications",
          "Paramètres",
        ].includes(item.label),
    );

  /*
   * ==========================================================
   * DASHBOARD
   * ==========================================================
   */

  const dashboard =
    navigationSidebar.find(
      (item) =>
        item.href ===
          "/tableau-de-bord" ||
        item.label ===
          "Tableau de bord" ||
        item.label === "Dashboard",
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

  /*
   * Le profil est placé
   * en bas de la Sidebar.
   */

  const items =
    autresItems.filter(
      (item) =>
        item.label !==
          "Profil" &&
        item.label !==
          "Mon profil",
    );

  /*
   * ==========================================================
   * SECTIONS
   * ==========================================================
   */

  const principal =
    items.filter(
      (item) =>
        getSection(
          item.label,
        ) === "PRINCIPAL",
    );

  const trouver =
    items.filter(
      (item) =>
        getSection(
          item.label,
        ) === "TROUVER",
    );

  const activite =
    items.filter(
      (item) =>
        getSection(
          item.label,
        ) ===
        "MON ACTIVITÉ",
    );

  const communaute =
    items.filter(
      (item) =>
        getSection(
          item.label,
        ) === "COMMUNAUTÉ",
    );

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
     * Groupe contenant plusieurs liens
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
          {!collapsed && (
            <p
              className="
                px-3
                pb-2
                pt-2
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-ink-soft/50
              "
            >
              {item.label}
            </p>
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
                    items-center
                    gap-3
                    rounded-lg
                    px-3
                    py-2.5
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
                        ? "bg-ink text-rice shadow-sm"
                        : "text-ink-soft hover:bg-ink/5 hover:text-ink"
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
                    <span className="truncate">
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
          py-2.5
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
              ? "bg-ink text-rice shadow-sm"
              : "text-ink-soft hover:bg-ink/5 hover:text-ink"
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
      sectionItems.length ===
      0
    ) {
      return null;
    }

    return (
      <div className="mb-5">
        {!collapsed && (
          <p
            className="
              px-3
              pb-2
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-ink-soft/50
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
        border-ink/10
        bg-paper
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
          border-ink/10

          ${
            collapsed
              ? "justify-center"
              : "justify-between px-5"
          }
        `}
      >
        <Link
          href="/tableau-de-bord"
          onClick={
            closeMobile
          }
          className="
            flex
            items-center
            gap-3
          "
          aria-label="Kianja"
        >
          <span
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-full
              border-2
              border-rice
              bg-ink
              font-mono
              text-xs
              font-bold
              text-rice
            "
          >
            K
          </span>

          {!collapsed && (
            <span
              className="
                font-display
                text-xl
                font-semibold
                tracking-tight
                text-ink
              "
            >
              Kianja
            </span>
          )}
        </Link>

        {/* Bouton fermer */}

        {!collapsed && (
          <button
            type="button"
            onClick={() =>
              setCollapsed(
                true,
              )
            }
            aria-label="Fermer la barre latérale"
            title="Fermer le menu"
            className="
              hidden
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-ink-soft
              transition
              hover:bg-ink/5
              hover:text-ink
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
          UTILISATEUR
          ===================================================== */}

      {!collapsed && (
        <div
          className="
            shrink-0
            border-b
            border-ink/10
            px-5
            py-3
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
              mt-0.5
              truncate
              font-mono
              text-[9px]
              uppercase
              tracking-[0.12em]
              text-ink-soft/60
            "
          >
            {roleLabel(
              utilisateur.role,
            )}
          </p>
        </div>
      )}

      {/* =====================================================
          NAVIGATION
          ===================================================== */}

      <nav
        aria-label="Navigation principale"
        className="
          flex-1
          overflow-y-auto
          px-3
          py-5
        "
      >
        {/* Dashboard */}

        {dashboard && (
          <div className="mb-6">
            {renderItem(
              dashboard,
            )}
          </div>
        )}

        {/* Séparateur */}

        {!collapsed && (
          <div
            className="
              mb-5
              h-px
              bg-ink/10
            "
          />
        )}

        {/* Trouver */}

        {renderSection(
          "TROUVER",
          trouver,
        )}

        {/* Activité */}

        {renderSection(
          "MON ACTIVITÉ",
          activite,
        )}

        {/* Communauté */}

        {renderSection(
          "COMMUNAUTÉ",
          communaute,
        )}

        {/* Principal */}

        {renderSection(
          "PRINCIPAL",
          principal,
        )}
      </nav>

      {/* =====================================================
          BAS SIDEBAR
          ===================================================== */}

      <div
        className="
          shrink-0
          border-t
          border-ink/10
          p-3
        "
      >
        {/* Profil */}

        <Link
          href="/tableau-de-bord/profil"
          onClick={
            closeMobile
          }
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
            py-2.5
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
                ? "bg-ink text-rice"
                : "text-ink-soft hover:bg-ink/5 hover:text-ink"
            }
          `}
        >
          <User
            size={18}
            className="shrink-0"
          />

          {!collapsed && (
            <span>
              Mon profil
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
            py-2.5
            text-sm
            font-medium
            text-brique
            transition-colors
            hover:bg-brique/5

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
          z-40
          hidden
          h-screen
          lg:block
        "
      >
        {sidebarContent}

        {/* ===================================================
            BOUTON ROUVRIR
            =================================================== */}

        {collapsed && (
          <button
            type="button"
            onClick={() =>
              setCollapsed(
                false,
              )
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
              hover:text-rice
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
            z-[60]
            lg:hidden
          "
        >
          {/* Overlay */}

          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={
              closeMobile
            }
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
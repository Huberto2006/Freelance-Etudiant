"use client";

import { SectionSidebar, TiroirSidebar } from "@/components/ui/motion/SidebarTransition";
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
  FileText,
  Star,
  User,
  Users,
  UserRoundPlus,
  LogOut,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  KeyRound,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useNavLabel } from "@/i18n/use-nav-label";

import {
  useAuth,
} from "@/lib/auth-context";

import {
  navigationParRole,
  profilEnPiedParRole,
  type SousLienNav,
} from "@/lib/nav-links";

import { getFileUrl } from "@/lib/api";

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

// Mémorisation de l'état réduit/déployé entre deux visites (préférence
// d'affichage uniquement, aucune donnée métier).
const CLE_SIDEBAR_REDUITE = "kianja-sidebar-reduite";

function lireEtatReduit(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CLE_SIDEBAR_REDUITE) === "1";
  } catch {
    return false;
  }
}

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
  Factures: FileText,
  "Moyens de paiement": Wallet,

  "Évaluations": Star,
  Evaluations: Star,
  "Mes évaluations": Star,

  Profil: User,
  "Mon profil": User,

  Favoris: Star,

  Paramètres: Settings,

  // Administration
  Administration: ShieldCheck,
  Gestion: UsersRound,
  Signalements: Flag,

  // Publications du compte
  "Mes missions": BriefcaseBusiness,
  "Mes services": ShoppingBag,

  "Compte Google": KeyRound,
};

function getIcon(label: string) {
  return (
    ICONS[label] ??
    BriefcaseBusiness
  );
}

/** Vrai si `href` correspond à la page courante ou à l'une de ses sous-pages. */
function correspond(
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

  const t = useTranslations("navigation");
  const tn = useNavLabel().label;

  // Initialiseur paresseux : la Sidebar ne rend rien tant que
  // l'authentification charge (return null plus bas), donc aucune
  // divergence d'hydratation n'est possible.
  const [collapsed, setCollapsedBrut] =
    useState(lireEtatReduit);
  const [groupeOuvert, setGroupeOuvert] =
    useState<string | null>(null);
  const [groupeFlottant, setGroupeFlottant] =
    useState<string | null>(null);
  const [routeFlottante, setRouteFlottante] =
    useState(pathname);
  const [positionFlottante, setPositionFlottante] =
    useState({ top: 0, left: 0 });

  function setCollapsed(valeur: boolean) {
    setCollapsedBrut(valeur);
    try {
      window.localStorage.setItem(
        CLE_SIDEBAR_REDUITE,
        valeur ? "1" : "0",
      );
    } catch {
      /* stockage indisponible : l'état reste valable pour la session */
    }
  }

  const tiroirRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!groupeFlottant) return;

    function fermerAvecEchap(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setGroupeFlottant(null);
      }
    }

    document.addEventListener("keydown", fermerAvecEchap);
    return () => {
      document.removeEventListener("keydown", fermerAvecEchap);
    };
  }, [groupeFlottant]);

  const role = utilisateur?.role;
  const navigation = useMemo(
    () => (role ? navigationParRole[role] ?? [] : []),
    [role],
  );
  const hrefActif = [
    ...navigation.flatMap((groupe) => [
      groupe.href,
      ...(groupe.liens ?? []).map((lien) => lien.href),
    ]),
    "/tableau-de-bord/profil",
  ]
    .filter(
      (href): href is string =>
        typeof href === "string" && correspond(pathname, href),
    )
    .sort((a, b) => b.length - a.length)[0];

  function isActive(_chemin: string, href: string) {
    return href === hrefActif;
  }

  useEffect(() => {
    const groupeActif = navigation.find((groupe) =>
      (groupe.liens ?? []).some((lien) => lien.href === hrefActif),
    );

    if (groupeActif) {
      // The sidebar layout persists across navigation, so keep its active parent expanded.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGroupeOuvert(groupeActif.label);
    }
  }, [hrefActif, navigation]);

  /*
   * ==========================================================
   * TIROIR MOBILE — FOCUS ET DÉFILEMENT
   * ==========================================================
   * À l'ouverture : le focus entre dans le tiroir et la page derrière
   * ne défile plus. À la fermeture : le focus revient au déclencheur.
   */

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const declencheur =
      document.activeElement as HTMLElement | null;
    const defilementInitial =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";
    tiroirRef.current
      ?.querySelector<HTMLElement>("a, button")
      ?.focus();

    return () => {
      document.body.style.overflow = defilementInitial;
      declencheur?.focus?.();
    };
  }, [mobileOpen]);

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

  // Valeur non nulle figée pour les fonctions déclarées plus bas (TS ne
  // conserve pas le rétrécissement de type dans une déclaration hoistée).
  const utilisateurConnecte = utilisateur;

  /*
   * ==========================================================
   * ÉLÉMENTS GÉRÉS PAR LE NAVBAR
   * ==========================================================
   */

  const navigationSidebar = navigation;

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
   * Le contenu est produit par une fonction paramétrée par `collapsed` :
   * le bureau suit l'état mémorisé, le tiroir mobile est TOUJOURS
   * déployé (un tiroir réduit aux icônes n'aurait aucun sens au toucher).
   */
  function construireContenu(collapsed: boolean) {
  /*
   * ==========================================================
   * RENDRE UN ITEM
   * ==========================================================
   */

  function renderItem(
    item: (typeof navigationSidebar)[number],
  ) {
    const Icon = item.icon ?? getIcon(item.label);
    const liens = item.liens;

    /*
     * ========================================================
     * GROUPE AVEC SOUS-LIENS
     * ========================================================
     */

    if (
      liens &&
      liens.length > 0
    ) {
      const actif =
        liens.some((link) =>
          isActive(pathname, link.href),
        );
      const ouvert = groupeOuvert === item.label;
      const afficheSousMenu = collapsed
        ? groupeFlottant === item.label && routeFlottante === pathname
        : ouvert;

      function renderLien(link: SousLienNav) {
        const active = isActive(pathname, link.href);
        const LinkIcon = getIcon(link.label);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => {
              closeMobile();
              setGroupeFlottant(null);
            }}
            title={collapsed && !afficheSousMenu ? tn(link.label) : undefined}
            aria-current={active ? "page" : undefined}
            className={`
              group
              relative
              flex
              min-h-10
              items-center
              gap-3
              rounded-lg
              text-sm
              font-medium
              transition-[background-color,color,transform]
              duration-150
              ${collapsed && !afficheSousMenu ? "justify-center px-0 w-10 h-10 mx-auto" : "px-3 py-2"}
              ${
                active
                  ? "indicateur-actif bg-white/12 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-white"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              }
            `}
          >
            <LinkIcon
              size={18}
              strokeWidth={active ? 2.2 : 1.8}
              className="shrink-0"
            />
            {(!collapsed || afficheSousMenu) && (
              <span className="truncate">{tn(link.label)}</span>
            )}
          </Link>
        );
      }

      return (
        <div key={item.label} className="space-y-1">
          <button
            type="button"
            onClick={(event) => {
              if (collapsed) {
                if (
                  groupeFlottant === item.label &&
                  routeFlottante === pathname
                ) {
                  setGroupeFlottant(null);
                  setGroupeOuvert(null);
                  return;
                }

                const bounds = event.currentTarget.getBoundingClientRect();
                const hauteurMenu = Math.min(
                  380,
                  liens.length * 44 + 48,
                );
                setPositionFlottante({
                  top: Math.max(
                    8,
                    Math.min(bounds.top, window.innerHeight - hauteurMenu - 8),
                  ),
                  left: bounds.right + 8,
                });
                setGroupeOuvert(item.label);
                setGroupeFlottant(item.label);
                setRouteFlottante(pathname);
                return;
              }

              setGroupeOuvert(ouvert ? null : item.label);
              setGroupeFlottant(null);
            }}
            aria-label={tn(item.label)}
            aria-expanded={afficheSousMenu}
            title={collapsed ? tn(item.label) : undefined}
            className={`
              relative
              flex
              min-h-10
              w-full
              items-center
              gap-3
              rounded-lg
              text-sm
              font-medium
              transition-colors
              ${
                collapsed
                  ? "justify-center px-0 w-10 h-10 mx-auto"
                  : "px-3 py-2"
              }
              ${
                actif || ouvert
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              }
            `}
          >
            <Icon
              size={18}
              strokeWidth={actif ? 2.2 : 1.8}
              className="shrink-0"
            />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">
                  {tn(item.label)}
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 transition-transform ${ouvert ? "rotate-180" : ""}`}
                />
              </>
            )}
          </button>

          <SectionSidebar
            ouvert={!collapsed && ouvert}
            className="ml-3 space-y-1 border-l border-white/10 pl-2"
          >
            {liens.map(renderLien)}
          </SectionSidebar>

          {collapsed && afficheSousMenu && (
            <div
              role="region"
              aria-label={tn(item.label)}
              className="animate-slide-down fixed z-[80] min-w-52 rounded-xl border border-white/10 bg-panel p-2 shadow-xl"
              style={{
                top: positionFlottante.top,
                left: positionFlottante.left,
              }}
            >
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/55">
                {tn(item.label)}
              </p>
              <div className="space-y-1">{liens.map(renderLien)}</div>
            </div>
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

    const active = isActive(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => {
          closeMobile();
          setGroupeFlottant(null);
        }}
        title={
          collapsed
            ? tn(item.label)
            : undefined
        }
        aria-current={
          active
            ? "page"
            : undefined
        }
        className={`
          group
          relative
          flex
          min-h-10
          items-center
          gap-3
          rounded-lg
          text-sm
          font-medium
          transition-[background-color,color,transform]
          duration-150

          ${
            collapsed
              ? "justify-center px-0 w-10 h-10 mx-auto"
              : "px-3 py-2"
          }

          ${
            active
              ? "indicateur-actif bg-white/12 text-white font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-white"
              : "text-white/70 hover:bg-white/8 hover:text-white"
          }
        `}
      >
        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />

        {!collapsed && (
          <span className="truncate">
            {tn(item.label)}
          </span>
        )}
      </Link>
    );
  }

  /*
   * ==========================================================
   * CONTENU SIDEBAR
   * ==========================================================
   */

  return (
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
            ? "w-[4.75rem]"
            : "w-[16.25rem]"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-kianja.png"
            alt={t("sidebar.logoAlt")}
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
              shadow-xs
            "
          />

          {!collapsed && (
            <span className="leading-tight text-white">
              <span className="block text-base font-semibold tracking-tight">
                Kianja
              </span>

              <span className="block text-[0.625rem] text-white/55">
                {t("sidebar.tagline")}
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
            aria-label={t("sidebar.collapse")}
            aria-expanded="true"
            title={t("sidebar.collapseTitle")}
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
        aria-label={t("sidebar.mainNav")}
        className="
          kianja-scrollbar
          flex-1
          min-h-0
          overflow-y-auto
          px-3
          py-3
        "
      >
        <div className="space-y-1">
          {navigationSidebar.map(renderItem)}
        </div>
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

        {profilEnPiedParRole[utilisateurConnecte.role] && (
        <Link
          href="/tableau-de-bord/profil"
          onClick={closeMobile}
          title={
            collapsed
              ? tn("Mon profil")
              : undefined
          }
          className={`
            relative
            mb-1
            flex
            items-center
            gap-3
            rounded-lg
            text-sm
            font-medium
            transition-colors

            ${
              collapsed
                ? "justify-center px-0 w-10 h-10 mx-auto"
                : "px-3 py-2"
            }

            ${
              isActive(
                pathname,
                "/tableau-de-bord/profil",
              )
                ? "indicateur-actif bg-white/12 text-white font-medium before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-white"
                : "text-white/70 hover:bg-white/8 hover:text-white"
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
            {utilisateurConnecte.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  getFileUrl(
                    utilisateurConnecte.photoUrl,
                  ) ?? undefined
                }
                alt={utilisateurConnecte.nom}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} />
            )}
          </span>

          {!collapsed && (
            <span className="min-w-0 truncate">
              <span className="block truncate">
                {tn("Mon profil")}
              </span>

              <span className="block truncate text-[0.65rem] font-normal text-white/50">
                {utilisateurConnecte.nom}
              </span>
            </span>
          )}
        </Link>
        )}

        {/* Déconnexion */}

        <button
          type="button"
          onClick={logout}
          title={
            collapsed
              ? t("sidebar.logout")
              : undefined
          }
          className={`
            flex
            w-full
            items-center
            gap-3
            rounded-lg
            text-sm
            font-medium
            text-white/70
            transition-colors
            hover:bg-white/8
            hover:text-white

            ${
              collapsed
                ? "justify-center px-0 w-10 h-10 mx-auto"
                : "px-3 py-2"
            }
          `}
        >
          <LogOut
            size={18}
            className="shrink-0"
          />

          {!collapsed && (
            <span>
              {t("sidebar.logout")}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
  }

  const sidebarContent = construireContenu(collapsed);
  const sidebarMobile = construireContenu(false);

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
            aria-label={t("sidebar.expand")}
            aria-expanded="false"
            title={t("sidebar.expandTitle")}
            className="
              absolute
              right-[-12px]
              top-1/2
              flex
              h-6
              w-6
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-white/20
              bg-panel-dark
              text-white/80
              shadow-md
              transition-[background-color,color,transform]
              duration-150
              hover:bg-panel
              hover:text-white
            "
          >
            <ChevronRight
              size={14}
            />
          </button>
        )}
      </div>

      {/* =====================================================
          MOBILE
          ===================================================== */}

      <TiroirSidebar
        ouvert={mobileOpen}
        libelle={t("sidebar.mainNav")}
        libelleFermer={t("sidebar.closeMenu")}
        surFermer={closeMobile}
        refTiroir={tiroirRef}
        classeTiroir="relative z-[71] h-full w-[16.25rem] max-w-[85vw]"
      >
        {sidebarMobile}
      </TiroirSidebar>
    </>
  );
}
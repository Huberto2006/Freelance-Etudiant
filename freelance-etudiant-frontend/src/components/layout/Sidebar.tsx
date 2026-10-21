
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
  FileText,
  Star,
  User,
  Users,
  UserRoundPlus,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Newspaper,
  FolderKanban,
  MessageCircle,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { navigationParRole } from "@/lib/nav-links";
import { getFileUrl } from "@/lib/api";
import type { GroupeNav } from "@/lib/nav-links";
import type { LucideIcon } from "lucide-react";

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const SIDEBAR_OPEN_WIDTH = "260px";
const SIDEBAR_CLOSED_WIDTH = "76px";

const ICONS: Record<string, LucideIcon> = {
  "Tableau de bord": Home,
  Dashboard: Home,
  Publications: Newspaper,
  Missions: BriefcaseBusiness,
  Services: ShoppingBag,

  "Mon activité": FolderKanban,
  "Mes publications": Layers3,
  "Mes services": ShoppingBag,
  "Mes missions": BriefcaseBusiness,
  Candidatures: ClipboardList,
  "Mes candidatures": ClipboardList,
  "Demandes de service": ClipboardList,
  Livraisons: Package,
  "Mes livraisons": Package,

  Finances: Wallet,
  Paiements: Wallet,
  "Mes paiements": Wallet,
  Factures: FileText,
  "Moyens de paiement": Wallet,

  Communication: MessageCircle,
  Messages: MessageCircle,
  Notifications: Bell,

  Communauté: Users,
  Groupes: Users,
  Amis: UserRoundPlus,
  Favoris: Star,

  Administration: ShieldCheck,
  Évaluations: Star,
  Evaluations: Star,
  "Mes évaluations": Star,

  Profil: User,
  "Mon profil": User,
  Paramètres: Settings,
};

function getIcon(label: string): LucideIcon {
  return ICONS[label] ?? BriefcaseBusiness;
}

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;

  if (href === "/tableau-de-bord") return false;

  return pathname.startsWith(`${href}/`);
}

type NavSection = {
  title: string;
  items: GroupeNav[];
};

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { utilisateur, deconnecter, chargement } = useAuth();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<
    Record<string, boolean>
  >({});

  const navigation = utilisateur
    ? navigationParRole[utilisateur.role] ?? []
    : [];

  // Les messages et notifications peuvent rester dans le Navbar
  // lorsqu'ils sont déclarés comme liens principaux séparés.
  // Ils restent visibles ici s'ils appartiennent à un groupe.
  const navigationSidebar = navigation.filter(
    (item) =>
      !["Messages", "Notifications"].includes(item.label),
  );

  const dashboard = navigationSidebar.find(
    (item) =>
      item.href === "/tableau-de-bord" ||
      item.label === "Tableau de bord" ||
      item.label === "Dashboard",
  );

  const parametres = navigationSidebar.find(
    (item) => item.label === "Paramètres",
  );

  const profilDansNavigation = navigationSidebar.find(
    (item) =>
      item.label === "Profil" || item.label === "Mon profil",
  );

  const items = navigationSidebar.filter(
    (item) =>
      item !== dashboard &&
      item !== parametres &&
      item !== profilDansNavigation,
  );

  const trouverLabels = [
    "Publications",
    "Missions",
    "Services",
    "Explorer",
  ];

  const activiteLabels = [
    "Mon activité",
    "Mes publications",
    "Mes services",
    "Mes missions",
    "Mes candidatures",
    "Candidatures",
    "Demandes de service",
    "Livraisons",
    "Mes livraisons",
    "Finances",
    "Paiements",
    "Mes paiements",
    "Factures",
    "Évaluations",
    "Mes évaluations",
    "Evaluations",
  ];

  const communicationLabels = ["Communication"];
  const communauteLabels = ["Communauté", "Groupes", "Amis", "Favoris"];
  const administrationLabels = ["Administration"];

  const trouver = items.filter((item) =>
    trouverLabels.includes(item.label),
  );

  const activite = items.filter((item) =>
    activiteLabels.includes(item.label),
  );

  const communication = items.filter((item) =>
    communicationLabels.includes(item.label),
  );

  const communaute = items.filter((item) =>
    communauteLabels.includes(item.label),
  );

  const administration = items.filter((item) =>
    administrationLabels.includes(item.label),
  );

  const labelsClasses = [
    ...trouverLabels,
    ...activiteLabels,
    ...communicationLabels,
    ...communauteLabels,
    ...administrationLabels,
  ];

  const autres = items.filter(
    (item) => !labelsClasses.includes(item.label),
  );

  const sections: NavSection[] = [
    {
      title: "PRINCIPAL",
      items: dashboard ? [dashboard] : [],
    },
    {
      title: "EXPLORER",
      items: trouver,
    },
    {
      title: "MON ACTIVITÉ",
      items: activite,
    },
    {
      title: "COMMUNICATION",
      items: communication,
    },
    {
      title: "COMMUNAUTÉ",
      items: communaute,
    },
    {
      title: "ADMINISTRATION",
      items: administration,
    },
    {
      title: "AUTRES",
      items: autres,
    },
  ];

  // Ouvre automatiquement tout groupe contenant la page active.
  useEffect(() => {
    if (!pathname) return;

    setExpandedGroups((previous) => {
      const next = { ...previous };
      let changed = false;

      for (const item of navigationSidebar) {
        if (
          item.liens?.some((link) =>
            isActive(pathname, link.href),
          ) &&
          !next[item.label]
        ) {
          next[item.label] = true;
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [pathname, utilisateur?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronise la largeur utilisée par le layout.
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

  const closeMobile = useCallback(() => {
    onMobileClose?.();
  }, [onMobileClose]);

  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobile();
      }
    }

    document.addEventListener("keydown", handleKeyboard);

    return () => {
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [mobileOpen, closeMobile]);

  function logout() {
    closeMobile();
    deconnecter();
  }

  function toggleGroup(label: string, containsActiveLink: boolean) {
    if (collapsed) {
      setCollapsed(false);
      setExpandedGroups((previous) => ({
        ...previous,
        [label]: true,
      }));
      return;
    }

    setExpandedGroups((previous) => ({
      ...previous,
      [label]: !(previous[label] ?? containsActiveLink),
    }));
  }

  function renderItem(item: GroupeNav) {
    const Icon = item.icon ?? getIcon(item.label);

    // Menu parent avec sous-menus.
    if (item.liens && item.liens.length > 0) {
      const containsActiveLink = item.liens.some((link) =>
        isActive(pathname, link.href),
      );

      const expanded =
        expandedGroups[item.label] ?? containsActiveLink;

      return (
        <div key={item.label} className="space-y-1">
          <button
            type="button"
            onClick={() =>
              toggleGroup(item.label, containsActiveLink)
            }
            title={collapsed ? item.label : undefined}
            aria-expanded={collapsed ? false : expanded}
            className={`
              flex min-h-10 w-full items-center gap-3
              rounded-lg px-3 py-2 text-sm font-medium
              transition-colors
              ${collapsed ? "justify-center" : ""}
              ${
                containsActiveLink
                  ? "bg-white/10 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }
            `}
          >
            <Icon size={18} className="shrink-0" />

            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">
                  {item.label}
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>

          {!collapsed && expanded && (
            <div className="ml-4 space-y-1 border-l border-white/10 pl-3">
              {item.liens.map((link) => {
                const active = isActive(pathname, link.href);
                const LinkIcon = getIcon(link.label);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    aria-current={active ? "page" : undefined}
                    className={`
                      flex min-h-9 items-center gap-3
                      rounded-lg px-3 py-2 text-sm
                      transition-colors
                      ${
                        active
                          ? "bg-bleu text-white dark:text-slate-900"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <LinkIcon size={16} className="shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Lien simple.
    if (!item.href) return null;

    const active = isActive(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeMobile}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={`
          flex min-h-10 items-center gap-3 rounded-lg
          px-3 py-2 text-sm font-medium transition-colors
          ${collapsed ? "justify-center" : ""}
          ${
            active
              ? "bg-bleu text-white dark:text-slate-900 shadow-sm"
              : "text-white/75 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        <Icon
          size={18}
          strokeWidth={active ? 2.4 : 2}
          className="shrink-0"
        />

        {!collapsed && (
          <span className="truncate">{item.label}</span>
        )}
      </Link>
    );
  }

  function renderSection(title: string, sectionItems: GroupeNav[]) {
    if (sectionItems.length === 0) return null;

    return (
      <div key={title} className="mb-5">
        {!collapsed && (
          <p className="px-3 pb-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/45">
            {title}
          </p>
        )}

        <div className="space-y-1">
          {sectionItems.map((item) => renderItem(item))}
        </div>
      </div>
    );
  }

  if (chargement || !utilisateur) {
    return null;
  }

  const sidebarContent = (
    <aside
      className={`
        flex h-full flex-col border-r border-white/10
        bg-panel transition-[width] duration-200 ease-in-out
        ${collapsed ? "w-[4.75rem]" : "w-[16.25rem]"}
      `}
    >
      {/* En-tête et logo */}
      <div
        className={`
          flex h-16 shrink-0 items-center border-b border-white/10
          ${collapsed ? "justify-center" : "justify-between px-5"}
        `}
      >
        <Link
          href="/tableau-de-bord"
          onClick={closeMobile}
          className="flex items-center gap-3"
          aria-label="Kianja"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-kianja.png"
            alt="Logo Kianja"
            className="h-9 w-9 shrink-0 rounded-xl border border-white/15 bg-white object-contain p-1 shadow-sm"
          />

          {!collapsed && (
            <span className="leading-tight text-white">
              <span className="block text-base font-semibold tracking-tight">
                Kianja
              </span>
              <span className="block text-[0.625rem] text-white/55">
                Freelances étudiants
              </span>
            </span>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Réduire la barre latérale"
            title="Réduire le menu"
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white lg:flex"
          >
            <ChevronLeft size={17} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        aria-label="Navigation principale"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >
        {sections.map((section) =>
          renderSection(section.title, section.items),
        )}

        {parametres && (
          <div className="mb-5 border-t border-white/10 pt-4">
            {renderItem(parametres)}
          </div>
        )}
      </nav>

      {/* Profil et déconnexion */}
      <div className="shrink-0 border-t border-white/10 bg-panel-dark p-3">
        <Link
          href={
            profilDansNavigation?.href ??
            "/tableau-de-bord/profil"
          }
          onClick={closeMobile}
          title={collapsed ? "Mon profil" : undefined}
          className={`
            mb-1 flex items-center gap-3 rounded-lg px-3 py-2
            text-sm font-medium transition-colors
            ${collapsed ? "justify-center" : ""}
            ${
              isActive(pathname, "/tableau-de-bord/profil")
                ? "bg-bleu text-white dark:text-slate-900"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-white/80">
            {utilisateur.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getFileUrl(utilisateur.photoUrl) ?? undefined}
                alt={utilisateur.nom}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} />
            )}
          </span>

          {!collapsed && (
            <span className="min-w-0 truncate">
              <span className="block truncate">Mon profil</span>
              <span className="block truncate text-[0.65rem] font-normal text-white/50">
                {utilisateur.nom}
              </span>
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={logout}
          title={collapsed ? "Se déconnecter" : undefined}
          className={`
            flex min-h-10 w-full items-center gap-3 rounded-lg
            px-3 py-2 text-sm font-medium text-white/75
            transition-colors hover:bg-white/10 hover:text-white
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Se déconnecter</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Sidebar desktop */}
      <div
        className="fixed left-0 top-0 z-[60] hidden h-screen lg:block"
        style={{ width: "var(--sidebar-width)" }}
      >
        {sidebarContent}

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Ouvrir la barre latérale"
            title="Ouvrir le menu"
            className="absolute right-[-14px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-paper text-ink-soft shadow-md transition-all duration-150 hover:scale-105 hover:bg-ink hover:text-paper-light"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={closeMobile}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          />

          <div className="relative z-[71] h-full w-[16.25rem]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}


"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";

import {
  useAuth,
  roleLabel,
} from "@/lib/auth-context";
import { navigationParRole } from "@/lib/nav-links";
import { getFileUrl } from "@/lib/api";
import { BasculeTheme } from "../ui/BasculeTheme";
import { MessagesLink } from "../ui/MessagesLink";
import { NotificationBell } from "../ui/NotificationBell";


interface NavbarProps {
  hasSidebar?: boolean;
  onMenuClick?: () => void;
}

export function Navbar({
  hasSidebar = false,
  onMenuClick,
}: NavbarProps) {
  const pathname = usePathname();

  const {
    utilisateur,
    deconnecter,
    chargement,
  } = useAuth();

  const [profilOuvert, setProfilOuvert] =
    useState(false);

  const [parametresOuverts, setParametresOuverts] =
    useState(false);

  const profilRef = useRef<HTMLDivElement>(null);
  const parametresRef = useRef<HTMLDivElement>(null);

  const estDansDashboard =
    pathname.startsWith("/tableau-de-bord");

  const estPageAuth = [
    "/connexion",
    "/inscription",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
  ].some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    function gererClicExterieur(event: MouseEvent) {
      const cible = event.target as Node;

      if (
        profilRef.current &&
        !profilRef.current.contains(cible)
      ) {
        setProfilOuvert(false);
      }

      if (
        parametresRef.current &&
        !parametresRef.current.contains(cible)
      ) {
        setParametresOuverts(false);
      }
    }

    function gererClavier(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfilOuvert(false);
        setParametresOuverts(false);
      }
    }

    document.addEventListener(
      "mousedown",
      gererClicExterieur,
    );

    document.addEventListener(
      "keydown",
      gererClavier,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        gererClicExterieur,
      );

      document.removeEventListener(
        "keydown",
        gererClavier,
      );
    };
  }, []);

  useEffect(() => {
    setProfilOuvert(false);
    setParametresOuverts(false);
  }, [pathname]);

  if (estPageAuth) {
    return null;
  }

  if (chargement) {
    return (
      <header
        className={[
          "fixed inset-x-0 top-0 z-40 h-16",
          "border-b border-slate-200/80",
          "bg-white/95 dark:border-slate-800",
          "dark:bg-slate-950/95",
          hasSidebar
            ? "lg:left-[var(--sidebar-width)]"
            : "left-0",
        ].join(" ")}
        aria-label="Chargement de la navigation"
      />
    );
  }

  const navigation = utilisateur
    ? navigationParRole[utilisateur.role] ?? []
    : [];

  const itemParametres = navigation.find(
    (item) => item.label === "Paramètres",
  );

  const liensParametres = (
    itemParametres?.liens ?? []
  ).filter(
    (item) =>
      !["Paiements", "Factures", "Favoris"].includes(
        item.label,
      ),
  );

  const hrefBascule = estDansDashboard
    ? "/"
    : "/tableau-de-bord";

  const nomUtilisateur =
    utilisateur?.nom?.trim() || "Mon compte";

  const photoUtilisateur = utilisateur?.photoUrl
    ? getFileUrl(utilisateur.photoUrl)
    : null;

  async function gererDeconnexion() {
    setProfilOuvert(false);
    await deconnecter();
  }

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 h-16",
        "border-b border-slate-200/80",
        "bg-white/95 shadow-sm shadow-slate-900/[0.02]",
        "backdrop-blur-xl",
        "dark:border-slate-800",
        "dark:bg-slate-950/95",
        hasSidebar
          ? "lg:left-[var(--sidebar-width)]"
          : "left-0",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full max-w-[1800px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Menu mobile du tableau de bord */}
        {hasSidebar && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu de navigation"
            className="
              inline-flex size-10 shrink-0 items-center
              justify-center rounded-xl
              text-slate-600 transition-colors
              hover:bg-slate-100 hover:text-slate-950
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-slate-400
              dark:text-slate-300 dark:hover:bg-slate-800
              dark:hover:text-white
              lg:hidden
            "
          >
            <Menu size={20} />
          </button>
        )}

        {/* Identité de la plateforme */}
        {!hasSidebar && (
          <Link
            href="/"
            aria-label="Kianja — Accueil"
            className="flex shrink-0 items-center gap-2.5"
          >
            <span
              className="
                flex size-9 items-center justify-center
                rounded-xl bg-slate-900 text-white
                dark:bg-white dark:text-slate-950
              "
            >
              <Compass size={20} strokeWidth={2.2} />
            </span>

            <span
              className="
                text-xl font-bold tracking-tight
                text-slate-900 dark:text-white
              "
            >
              Kianja
            </span>
          </Link>
        )}

        {/* Recherche desktop */}
        <form
          action="/services"
          method="GET"
          role="search"
          className="
            relative ml-2 hidden min-w-0 max-w-xl
            flex-1 md:block
          "
        >
          <Search
            size={18}
            aria-hidden="true"
            className="
              pointer-events-none absolute left-3.5 top-1/2
              -translate-y-1/2 text-slate-400
            "
          />

          <input
            type="search"
            name="q"
            placeholder="Rechercher un service..."
            aria-label="Rechercher un service"
            className="
              h-10 w-full rounded-xl
              border border-slate-200 bg-slate-50
              pl-10 pr-4 text-sm text-slate-900
              placeholder:text-slate-400
              outline-none transition-colors
              hover:border-slate-300
              focus:border-slate-300
              focus:ring-0 focus-visible:ring-2
              focus-visible:ring-slate-300
              dark:border-slate-800 dark:bg-slate-900
              dark:text-white dark:placeholder:text-slate-500
              dark:hover:border-slate-700
              dark:focus:border-slate-700
              dark:focus-visible:ring-slate-700
            "
          />
        </form>

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          {/* Recherche mobile */}
          <Link
            href="/services"
            aria-label="Rechercher un service"
            className="
              inline-flex size-10 items-center justify-center
              rounded-xl text-slate-600 transition-colors
              hover:bg-slate-100
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-slate-400
              dark:text-slate-300 dark:hover:bg-slate-800
              md:hidden
            "
          >
            <Search size={19} />
          </Link>

          {/* Apparence */}
          <div className="flex size-10 items-center justify-center">
            <BasculeTheme />
          </div>

          {utilisateur ? (
            <>
              {/* Accès public / tableau de bord */}
              <Link
                href={hrefBascule}
                title={
                  estDansDashboard
                    ? "Retourner au site"
                    : "Ouvrir mon tableau de bord"
                }
                aria-label={
                  estDansDashboard
                    ? "Retourner au site"
                    : "Ouvrir mon tableau de bord"
                }
                className="
                  hidden h-10 items-center gap-2
                  rounded-xl px-3 text-sm font-medium
                  text-slate-600 transition-colors
                  hover:bg-slate-100 hover:text-slate-950
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-slate-400
                  dark:text-slate-300 dark:hover:bg-slate-800
                  dark:hover:text-white sm:inline-flex
                "
              >
                {estDansDashboard ? (
                  <Compass size={18} />
                ) : (
                  <LayoutDashboard size={18} />
                )}

                <span className="hidden xl:inline">
                  {estDansDashboard
                    ? "Voir le site"
                    : "Tableau de bord"}
                </span>
              </Link>

              {/* Messages */}
              <div
                className="
                  flex size-10 items-center justify-center
                  rounded-xl transition-colors
                  hover:bg-slate-100
                  dark:hover:bg-slate-800
                "
              >
                <MessagesLink />
              </div>

              {/* Notifications */}
              <div
                className="
                  flex size-10 items-center justify-center
                  rounded-xl transition-colors
                  hover:bg-slate-100
                  dark:hover:bg-slate-800
                "
              >
                <NotificationBell />
              </div>

              {/* Paramètres */}
              {liensParametres.length > 0 && (
                <div
                  className="relative"
                  ref={parametresRef}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setParametresOuverts((ouvert) => !ouvert);
                      setProfilOuvert(false);
                    }}
                    aria-expanded={parametresOuverts}
                    aria-haspopup="menu"
                    className="
                      inline-flex size-10 items-center
                      justify-center rounded-xl
                      text-slate-600 transition-colors
                      hover:bg-slate-100 hover:text-slate-950
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-slate-400
                      dark:text-slate-300 dark:hover:bg-slate-800
                      dark:hover:text-white
                    "
                    aria-label="Ouvrir les paramètres"
                  >
                    <Settings size={19} />
                  </button>

                  {parametresOuverts && (
                    <div
                      role="menu"
                      className="
                        absolute right-0 top-12 z-50
                        w-64 overflow-hidden rounded-2xl
                        border border-slate-200 bg-white p-1.5
                        shadow-xl shadow-slate-900/10
                        dark:border-slate-800 dark:bg-slate-950
                      "
                    >
                      <p
                        className="
                          px-3 py-2 text-xs font-semibold
                          uppercase tracking-wider
                          text-slate-400
                        "
                      >
                        Paramètres
                      </p>

                      {liensParametres.map((lien) => (
                        <Link
                          key={lien.href}
                          href={lien.href}
                          role="menuitem"
                          onClick={() =>
                            setParametresOuverts(false)
                          }
                          className="
                            flex min-h-10 items-center
                            rounded-xl px-3 py-2 text-sm
                            text-slate-700 transition-colors
                            hover:bg-slate-100
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-slate-400
                            dark:text-slate-200
                            dark:hover:bg-slate-800
                          "
                        >
                          {lien.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Profil */}
              <div
                className="relative ml-1"
                ref={profilRef}
              >
                <button
                  type="button"
                  onClick={() => {
                    setProfilOuvert((ouvert) => !ouvert);
                    setParametresOuverts(false);
                  }}
                  aria-expanded={profilOuvert}
                  aria-haspopup="menu"
                  aria-label="Ouvrir le menu du compte"
                  className="
                    flex h-10 max-w-[190px] items-center
                    gap-2 rounded-xl border border-transparent
                    px-1.5 transition-colors
                    hover:border-slate-200 hover:bg-slate-50
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-slate-400
                    dark:hover:border-slate-800
                    dark:hover:bg-slate-900
                  "
                >
                  {photoUtilisateur ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUtilisateur}
                      alt=""
                      className="
                        size-8 shrink-0 rounded-full
                        border border-slate-200 object-cover
                        dark:border-slate-700
                      "
                    />
                  ) : (
                    <span
                      className="
                        flex size-8 shrink-0 items-center
                        justify-center rounded-full
                        bg-slate-100 text-slate-600
                        dark:bg-slate-800 dark:text-slate-200
                      "
                    >
                      <UserRound size={17} />
                    </span>
                  )}

                  <span className="hidden min-w-0 text-left lg:block">
                    <span
                      className="
                        block truncate text-sm font-semibold
                        text-slate-800 dark:text-slate-100
                      "
                    >
                      {nomUtilisateur}
                    </span>

                    <span
                      className="
                        block truncate text-xs
                        text-slate-500 dark:text-slate-400
                      "
                    >
                      {roleLabel(utilisateur.role)}
                    </span>
                  </span>

                  <ChevronDown
                    size={15}
                    aria-hidden="true"
                    className="
                      hidden shrink-0 text-slate-400
                      transition-transform lg:block
                    "
                  />
                </button>

                {profilOuvert && (
                  <div
                    role="menu"
                    className="
                      absolute right-0 top-12 z-50
                      w-64 overflow-hidden rounded-2xl
                      border border-slate-200 bg-white p-1.5
                      shadow-xl shadow-slate-900/10
                      dark:border-slate-800 dark:bg-slate-950
                    "
                  >
                    <div
                      className="
                        border-b border-slate-100 px-3 py-3
                        dark:border-slate-800
                      "
                    >
                      <p
                        className="
                          truncate text-sm font-semibold
                          text-slate-900 dark:text-white
                        "
                      >
                        {nomUtilisateur}
                      </p>

                      <p
                        className="
                          mt-0.5 truncate text-xs
                          text-slate-500 dark:text-slate-400
                        "
                      >
                        {roleLabel(utilisateur.role)}
                      </p>
                    </div>

                    <Link
                      href="/tableau-de-bord/profil"
                      role="menuitem"
                      onClick={() => setProfilOuvert(false)}
                      className="
                        mt-1 flex min-h-10 items-center gap-2.5
                        rounded-xl px-3 py-2 text-sm
                        text-slate-700 transition-colors
                        hover:bg-slate-100
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-slate-400
                        dark:text-slate-200 dark:hover:bg-slate-800
                      "
                    >
                      <UserRound size={17} />
                      Mon profil
                    </Link>

                    <Link
                      href={hrefBascule}
                      role="menuitem"
                      onClick={() => setProfilOuvert(false)}
                      className="
                        flex min-h-10 items-center gap-2.5
                        rounded-xl px-3 py-2 text-sm
                        text-slate-700 transition-colors
                        hover:bg-slate-100
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-slate-400
                        dark:text-slate-200 dark:hover:bg-slate-800
                      "
                    >
                      <LayoutDashboard size={17} />
                      {estDansDashboard
                        ? "Retourner au site"
                        : "Tableau de bord"}
                    </Link>

                    <div
                      className="
                        my-1 h-px bg-slate-100
                        dark:bg-slate-800
                      "
                    />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={gererDeconnexion}
                      className="
                        flex min-h-10 w-full items-center
                        gap-2.5 rounded-xl px-3 py-2
                        text-left text-sm font-medium
                        text-red-600 transition-colors
                        hover:bg-red-50
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-red-300
                        dark:text-red-400 dark:hover:bg-red-950/40
                      "
                    >
                      <LogOut size={17} />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="
                  hidden h-10 items-center rounded-xl
                  px-3 text-sm font-medium text-slate-700
                  transition-colors hover:bg-slate-100
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-slate-400
                  dark:text-slate-200 dark:hover:bg-slate-800
                  sm:inline-flex
                "
              >
                Connexion
              </Link>

              <Link
                href="/inscription"
                className="
                  inline-flex h-10 items-center justify-center
                  rounded-xl bg-slate-900 px-4
                  text-sm font-semibold text-white
                  transition-colors hover:bg-slate-700
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-slate-400
                  focus-visible:ring-offset-2
                  dark:bg-white dark:text-slate-950
                  dark:hover:bg-slate-200
                "
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

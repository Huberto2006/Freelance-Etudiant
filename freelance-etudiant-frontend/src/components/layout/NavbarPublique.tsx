"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth, roleLabel } from "@/lib/auth-context";
import { getFileUrl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { BasculeTheme } from "@/components/ui/BasculeTheme";
import { MessagesLink } from "@/components/ui/MessagesLink";
import { NotificationBell } from "@/components/ui/NotificationBell";

const liensPublics: {
  href: string;
  label: string;
  /** Astuce au survol : précise le côté de la marketplace concerné. */
  hint?: string;
}[] = [
  { href: "/", label: "Accueil" },
  { href: "/publications", label: "Publications" },
  {
    href: "/missions",
    label: "Missions",
    hint: "Besoins publiés par les clients",
  },
  {
    href: "/services",
    label: "Services",
    hint: "Prestations proposées par les étudiants",
  },
];

export function NavbarPublique() {
  const { utilisateur, deconnecter, chargement } = useAuth();
  const pathname = usePathname();
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [menuProfilOuvert, setMenuProfilOuvert] = useState(false);
  const navbarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function fermerMenus(event: MouseEvent) {
      if (!navbarRef.current?.contains(event.target as Node)) {
        setMenuProfilOuvert(false);
      }
    }

    function fermerAvecEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuMobileOuvert(false);
        setMenuProfilOuvert(false);
      }
    }

    document.addEventListener("mousedown", fermerMenus);
    document.addEventListener("keydown", fermerAvecEscape);

    return () => {
      document.removeEventListener("mousedown", fermerMenus);
      document.removeEventListener("keydown", fermerAvecEscape);
    };
  }, []);

  function fermerMenuMobile() {
    setMenuMobileOuvert(false);
  }

  function estActif(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header
      ref={navbarRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-paper-light/95 shadow-[0_2px_12px_rgba(15,23,42,0.06)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-8">
        <button
          type="button"
          onClick={() => setMenuMobileOuvert((ouvert) => !ouvert)}
          aria-label={menuMobileOuvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuMobileOuvert}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
        >
          {menuMobileOuvert ? <X size={19} /> : <Menu size={19} />}
        </button>

        <Link href="/" aria-label="Kianja" className="flex shrink-0 items-center gap-2">
          <img
            src="/images/logo-kianja.png"
            alt="Logo Kianja"
            className="h-10 w-10 rounded-xl border border-ink/10 bg-paper-light p-1 object-contain shadow-sm"
          />
          <span className="hidden text-base font-semibold tracking-tight text-ink sm:block">
            Kianja
          </span>
        </Link>

        <nav aria-label="Navigation publique" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {liensPublics.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              title={lien.hint}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                estActif(lien.href)
                  ? "text-bleu-dark"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {lien.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <form action="/services" role="search" className="hidden xl:block">
            <div className="relative w-64">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60" aria-hidden="true" />
              <input
                type="search"
                name="q"
                placeholder="Rechercher un service…"
                aria-label="Rechercher un service"
                className="h-9 w-full rounded-full border border-ink/15 bg-paper-light pl-9 pr-3 text-xs text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-bleu focus:ring-2 focus:ring-bleu/20"
              />
            </div>
          </form>

          <Link href="/services" aria-label="Rechercher" title="Rechercher" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink xl:hidden">
            <Search size={18} />
          </Link>

          {!chargement && utilisateur ? (
            <>
              <div className="hidden items-center gap-1 sm:flex">
                <MessagesLink />
                <NotificationBell />
              </div>

              <Link href="/tableau-de-bord" className="hidden h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink md:flex">
                <LayoutDashboard size={17} />
                <span className="hidden xl:inline">Tableau de bord</span>
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuProfilOuvert((ouvert) => !ouvert)}
                  aria-label="Menu du profil"
                  aria-haspopup="menu"
                  aria-expanded={menuProfilOuvert}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-1.5 transition-colors hover:bg-ink/5"
                >
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ocre/10 text-ocre-dark ring-1 ring-ink/10">
                    {utilisateur.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFileUrl(utilisateur.photoUrl) ?? undefined} alt={utilisateur.nom} className="h-full w-full object-cover" />
                    ) : (
                      <User size={15} />
                    )}
                  </span>
                  <span className="hidden max-w-28 text-left leading-tight sm:block">
                    <span className="block truncate text-xs font-medium text-ink">{utilisateur.nom}</span>
                    <span className="block truncate text-[9px] uppercase tracking-wider text-ink-soft/60">{roleLabel(utilisateur.role)}</span>
                  </span>
                  <ChevronDown size={13} className={`hidden transition-transform sm:block ${menuProfilOuvert ? "rotate-180" : ""}`} />
                </button>

                {menuProfilOuvert && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-ink/10 bg-paper-light shadow-xl">
                    <Link href="/tableau-de-bord" onClick={() => setMenuProfilOuvert(false)} role="menuitem" className="flex items-center gap-3 px-4 py-3 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink">
                      <LayoutDashboard size={15} /> Tableau de bord
                    </Link>
                    <Link href="/tableau-de-bord/profil" onClick={() => setMenuProfilOuvert(false)} role="menuitem" className="flex items-center gap-3 border-t border-ink/10 px-4 py-3 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink">
                      <User size={15} /> Mon profil
                    </Link>
                    <button type="button" onClick={deconnecter} role="menuitem" className="w-full border-t border-ink/10 px-4 py-3 text-left text-sm text-brique transition-colors hover:bg-brique/5">
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <BasculeTheme />
              <Link href="/connexion"><Button variant="ghost" size="sm">Se connecter</Button></Link>
              <Link href="/inscription"><Button variant="primary" size="sm">S&apos;inscrire</Button></Link>
            </div>
          )}
        </div>
      </div>

      {menuMobileOuvert && (
        <div className="border-t border-ink/10 bg-paper-light px-4 py-3 lg:hidden">
          {/* Recherche mobile : même destination que la recherche desktop.
              La soumission ferme le panneau (la navbar reste montée lors
              d'une navigation client-side, aucun useEffect nécessaire). */}
          <form action="/services" role="search" className="mb-3" onSubmit={fermerMenuMobile}>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60" aria-hidden="true" />
              <input
                type="search"
                name="q"
                placeholder="Rechercher un service…"
                aria-label="Rechercher un service"
                className="h-10 w-full rounded-full border border-ink/15 bg-paper-light pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/50 focus:border-bleu focus:ring-2 focus:ring-bleu/20"
              />
            </div>
          </form>

          <nav aria-label="Navigation mobile publique" className="space-y-1">
            {liensPublics.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={fermerMenuMobile}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  estActif(lien.href)
                    ? "bg-bleu-soft text-bleu-dark"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {lien.label}

                {lien.hint && (
                  <span className="mt-0.5 block text-xs font-normal text-ink-soft/60">
                    {lien.hint}
                  </span>
                )}
              </Link>
            ))}
            {!chargement && !utilisateur && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-ink/10 pt-3">
                <Link href="/connexion" onClick={fermerMenuMobile}><Button variant="ghost" size="sm" className="w-full">Se connecter</Button></Link>
                <Link href="/inscription" onClick={fermerMenuMobile}><Button variant="primary" size="sm" className="w-full">S&apos;inscrire</Button></Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

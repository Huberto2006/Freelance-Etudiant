"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Info,
  LayoutDashboard,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

import { useAuth, roleLabel } from "@/lib/auth-context";
import { getFileUrl } from "@/lib/api";
import {
  LIEN_A_PROPOS,
  LIEN_ACCUEIL,
  MENU_AIDE,
  MENU_EXPLORER,
  cheminCorrespond,
  type MenuPublicDeroulant,
} from "@/lib/navigation-publique";
import { BasculeTheme } from "@/components/ui/BasculeTheme";
import { MessagesLink } from "@/components/ui/MessagesLink";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { MenuDeroulantNav } from "@/components/layout/MenuDeroulantNav";

const SIGNATURE = "Freelance • Compétences • Opportunités";

/*
 * Styles communs.
 * Le focus utilise une couleur neutre, sans bordure bleue épaissie.
 */
const styleFocus = [
  "focus-visible:outline-2",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-ink/40",
].join(" ");

const styleBoutonConnexion = clsx(
  "inline-flex min-h-10 items-center justify-center",
  "rounded-lg border border-ink/20 px-3 py-2",
  "text-sm font-medium text-ink",
  "transition-colors hover:border-ink/40 hover:bg-ink/5",
  styleFocus,
);

const styleBoutonRejoindre = clsx(
  "inline-flex min-h-10 items-center justify-center",
  "rounded-lg border border-ink bg-ink px-3 py-2",
  "text-sm font-medium text-paper-light",
  "transition-colors hover:bg-ink-soft",
  styleFocus,
);

/**
 * Un état d'ouverture est valable uniquement sur la route
 * où il a été créé.
 */
interface EtatOuverture {
  valeur: string | null;
  chemin: string;
}

const etatFerme = (chemin: string): EtatOuverture => ({
  valeur: null,
  chemin,
});

export function NavbarPublique() {
  const { utilisateur, deconnecter, chargement } = useAuth();
  const pathname = usePathname();
  const navbarRef = useRef<HTMLElement>(null);

  const [menuOuvert, setMenuOuvert] = useState<EtatOuverture>({
    valeur: null,
    chemin: "",
  });

  const [menuMobile, setMenuMobile] = useState<EtatOuverture>({
    valeur: null,
    chemin: "",
  });

  const [menuProfil, setMenuProfil] = useState<EtatOuverture>({
    valeur: null,
    chemin: "",
  });

  const dropdownOuvert =
    menuOuvert.chemin === pathname ? menuOuvert.valeur : null;

  const menuMobileOuvert =
    menuMobile.chemin === pathname && menuMobile.valeur === "ouvert";

  const menuProfilOuvert =
    menuProfil.chemin === pathname && menuProfil.valeur === "ouvert";

  /*
   * Fermer tous les menus :
   * - lors d'un clic en dehors de la navbar ;
   * - lorsque l'utilisateur appuie sur Échap.
   */
  useEffect(() => {
    function fermerSiClicExterieur(event: PointerEvent) {
      const cible = event.target;

      if (
        cible instanceof Node &&
        !navbarRef.current?.contains(cible)
      ) {
        setMenuOuvert((etat) => ({ ...etat, valeur: null }));
        setMenuMobile((etat) => ({ ...etat, valeur: null }));
        setMenuProfil((etat) => ({ ...etat, valeur: null }));
      }
    }

    function fermerAvecEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setMenuOuvert((etat) => ({ ...etat, valeur: null }));
      setMenuMobile((etat) => ({ ...etat, valeur: null }));
      setMenuProfil((etat) => ({ ...etat, valeur: null }));
    }

    document.addEventListener("pointerdown", fermerSiClicExterieur);
    document.addEventListener("keydown", fermerAvecEscape);

    return () => {
      document.removeEventListener("pointerdown", fermerSiClicExterieur);
      document.removeEventListener("keydown", fermerAvecEscape);
    };
  }, []);

  function fermerTousLesMenus() {
    setMenuOuvert(etatFerme(pathname));
    setMenuMobile(etatFerme(pathname));
    setMenuProfil(etatFerme(pathname));
  }

  function basculerDropdown(id: string, ouvrir: boolean) {
    setMenuOuvert({
      valeur: ouvrir ? id : null,
      chemin: pathname,
    });

    if (ouvrir) {
      setMenuProfil(etatFerme(pathname));
    }
  }

  function fermerMenuMobile() {
    setMenuMobile(etatFerme(pathname));
  }

  function basculerMenuMobile() {
    setMenuMobile({
      valeur: menuMobileOuvert ? null : "ouvert",
      chemin: pathname,
    });

    setMenuOuvert(etatFerme(pathname));
    setMenuProfil(etatFerme(pathname));
  }

  function basculerMenuProfil() {
    setMenuProfil({
      valeur: menuProfilOuvert ? null : "ouvert",
      chemin: pathname,
    });

    setMenuOuvert(etatFerme(pathname));
    setMenuMobile(etatFerme(pathname));
  }

  function gererDeconnexion() {
    fermerTousLesMenus();
    deconnecter();
  }

  const accueilActif = pathname === LIEN_ACCUEIL.href;

  const aProposActif = cheminCorrespond(pathname, [
    LIEN_A_PROPOS.href,
  ]);

  const classeLien = (actif: boolean) =>
    clsx(
      "rounded-lg px-3 py-2 text-sm font-medium",
      "transition-colors",
      styleFocus,
      actif
        ? "text-ink"
        : "text-ink-soft hover:bg-ink/5 hover:text-ink",
    );

  return (
    <header
      ref={navbarRef}
      className={clsx(
        "fixed inset-x-0 top-0 z-50",
        "border-b border-ink/10",
        "bg-paper-light/95",
        "shadow-[0_2px_12px_rgba(15,23,42,0.06)]",
        "backdrop-blur-md",
      )}
    >
      <div
        className={clsx(
          "mx-auto flex h-16 max-w-7xl items-center",
          "gap-2 px-3 sm:gap-3 sm:px-5 lg:gap-5",
        )}
      >
        {/* Bouton du menu mobile */}
        <button
          type="button"
          onClick={basculerMenuMobile}
          aria-label={
            menuMobileOuvert ? "Fermer le menu" : "Ouvrir le menu"
          }
          aria-expanded={menuMobileOuvert}
          aria-controls="menu-mobile-public"
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center",
            "rounded-lg text-ink-soft",
            "transition-colors hover:bg-ink/5 hover:text-ink",
            styleFocus,
            "lg:hidden",
          )}
        >
          {menuMobileOuvert ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo et signature */}
        <Link
          href={LIEN_ACCUEIL.href}
          aria-label="Kianja — accueil"
          onClick={fermerTousLesMenus}
          className={clsx(
            "flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg",
            styleFocus,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-kianja.png"
            alt=""
            aria-hidden="true"
            className={clsx(
              "h-10 w-10 shrink-0 rounded-xl",
              "border border-ink/10 bg-paper-light",
              "object-contain p-1 shadow-sm",
            )}
          />

          <span className="hidden min-w-0 leading-tight min-[400px]:block">
            <span className="block text-base font-semibold tracking-tight text-ink">
              Kianja
            </span>

            <span
              className={clsx(
                "hidden whitespace-nowrap text-[0.65rem]",
                "uppercase tracking-wider text-ink-soft/70",
                "sm:block lg:hidden xl:block",
              )}
            >
              {SIGNATURE}
            </span>
          </span>
        </Link>

        {/* Navigation desktop */}
        <nav
          aria-label="Navigation publique"
          className={clsx(
            "hidden min-w-0 flex-1 items-center justify-center gap-1",
            "lg:flex",
          )}
        >
          <Link
            href={LIEN_ACCUEIL.href}
            onClick={fermerTousLesMenus}
            aria-current={accueilActif ? "page" : undefined}
            className={classeLien(accueilActif)}
          >
            {LIEN_ACCUEIL.label}
          </Link>

          <MenuDeroulantNav
            menu={MENU_EXPLORER}
            ouvert={dropdownOuvert === MENU_EXPLORER.id}
            actif={cheminCorrespond(
              pathname,
              MENU_EXPLORER.prefixesActifs,
            )}
            onOuvrirChange={(ouvrir) =>
              basculerDropdown(MENU_EXPLORER.id, ouvrir)
            }
          />

          <MenuDeroulantNav
            menu={MENU_AIDE}
            ouvert={dropdownOuvert === MENU_AIDE.id}
            actif={cheminCorrespond(
              pathname,
              MENU_AIDE.prefixesActifs,
            )}
            onOuvrirChange={(ouvrir) =>
              basculerDropdown(MENU_AIDE.id, ouvrir)
            }
          />
        </nav>

        {/* Recherche et actions */}
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          {/* Recherche complète sur les très grands écrans */}
          <form
            action="/services"
            role="search"
            className="hidden 2xl:block"
          >
            <div className="relative w-56">
              <Search
                size={15}
                aria-hidden="true"
                className={clsx(
                  "pointer-events-none absolute left-3 top-1/2",
                  "-translate-y-1/2 text-ink-soft/60",
                )}
              />

              <input
                type="search"
                name="q"
                placeholder="Rechercher un service…"
                aria-label="Rechercher un service"
                className={clsx(
                  "kianja-field-control h-9 w-full rounded-full",
                  "border border-ink/10 bg-paper-light",
                  "pl-9 pr-3 text-xs text-ink",
                  "outline-none transition-colors",
                  "placeholder:text-ink-soft/50",
                  "focus:border-ink/20 focus:ring-0",
                  "focus-visible:outline-2",
                  "focus-visible:outline-offset-2",
                  "focus-visible:outline-ink/40",
                )}
              />
            </div>
          </form>

          {/* Accès à la recherche sur les écrans plus petits */}
          <Link
            href="/services"
            aria-label="Rechercher un service"
            title="Rechercher un service"
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center",
              "rounded-lg text-ink-soft",
              "transition-colors hover:bg-ink/5 hover:text-ink",
              styleFocus,
              "2xl:hidden",
            )}
          >
            <Search size={18} />
          </Link>

          {/* Thème disponible pour tous les utilisateurs */}
          <div className="flex shrink-0 items-center justify-center">
            <BasculeTheme />
          </div>

          {!chargement && utilisateur ? (
            <>
              {/* Messages, notifications et à-propos */}
              <div className="hidden shrink-0 items-center gap-1 sm:flex">
                <MessagesLink />
                <NotificationBell />

                <Link
                  href={LIEN_A_PROPOS.href}
                  aria-label={LIEN_A_PROPOS.label}
                  title={LIEN_A_PROPOS.label}
                  aria-current={aProposActif ? "page" : undefined}
                  onClick={fermerTousLesMenus}
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    "transition-colors",
                    styleFocus,
                    aProposActif
                      ? "bg-ink/10 text-ink"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <Info size={18} aria-hidden="true" />
                </Link>
              </div>

              {/* Tableau de bord */}
              <Link
                href="/tableau-de-bord"
                onClick={fermerTousLesMenus}
                className={clsx(
                  "hidden h-9 shrink-0 items-center gap-2 rounded-lg px-2",
                  "text-sm font-medium text-ink-soft",
                  "transition-colors hover:bg-ink/5 hover:text-ink",
                  styleFocus,
                  "md:flex",
                )}
              >
                <LayoutDashboard size={17} />
                <span className="hidden xl:inline">
                  Tableau de bord
                </span>
              </Link>

              {/* Menu du profil */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={basculerMenuProfil}
                  aria-label="Menu du profil"
                  aria-haspopup="menu"
                  aria-expanded={menuProfilOuvert}
                  className={clsx(
                    "flex h-10 items-center gap-1.5 rounded-lg px-1.5",
                    "transition-colors hover:bg-ink/5",
                    styleFocus,
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center",
                      "overflow-hidden rounded-full",
                      "bg-ocre/10 text-ocre-dark",
                      "ring-1 ring-ink/10",
                    )}
                  >
                    {utilisateur.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          getFileUrl(utilisateur.photoUrl) ?? undefined
                        }
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={15} aria-hidden="true" />
                    )}
                  </span>

                  <span className="hidden max-w-28 text-left leading-tight sm:block">
                    <span className="block truncate text-xs font-medium text-ink">
                      {utilisateur.nom}
                    </span>

                    <span className="block truncate text-[0.625rem] uppercase tracking-wider text-ink-soft/60">
                      {roleLabel(utilisateur.role)}
                    </span>
                  </span>

                  <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={clsx(
                      "hidden transition-transform sm:block",
                      menuProfilOuvert && "rotate-180",
                    )}
                  />
                </button>

                {menuProfilOuvert && (
                  <div
                    role="menu"
                    aria-label="Options du profil"
                    className={clsx(
                      "absolute right-0 top-full mt-2 w-56",
                      "overflow-hidden rounded-xl",
                      "border border-ink/10 bg-paper-light shadow-xl",
                    )}
                  >
                    <Link
                      href="/tableau-de-bord"
                      onClick={fermerTousLesMenus}
                      role="menuitem"
                      className={clsx(
                        "flex min-h-11 items-center gap-3 px-4 py-3",
                        "text-sm text-ink-soft transition-colors",
                        "hover:bg-ink/5 hover:text-ink",
                        styleFocus,
                      )}
                    >
                      <LayoutDashboard size={15} aria-hidden="true" />
                      Tableau de bord
                    </Link>

                    <Link
                      href="/tableau-de-bord/profil"
                      onClick={fermerTousLesMenus}
                      role="menuitem"
                      className={clsx(
                        "flex min-h-11 items-center gap-3 px-4 py-3",
                        "border-t border-ink/10",
                        "text-sm text-ink-soft transition-colors",
                        "hover:bg-ink/5 hover:text-ink",
                        styleFocus,
                      )}
                    >
                      <User size={15} aria-hidden="true" />
                      Mon profil
                    </Link>

                    <button
                      type="button"
                      onClick={gererDeconnexion}
                      role="menuitem"
                      className={clsx(
                        "flex min-h-11 w-full items-center",
                        "border-t border-ink/10 px-4 py-3",
                        "text-left text-sm text-brique",
                        "transition-colors hover:bg-brique/5",
                        styleFocus,
                      )}
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Link
                href={LIEN_A_PROPOS.href}
                aria-label={LIEN_A_PROPOS.label}
                title={LIEN_A_PROPOS.label}
                aria-current={aProposActif ? "page" : undefined}
                onClick={fermerTousLesMenus}
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  "transition-colors",
                  styleFocus,
                  aProposActif
                    ? "bg-ink/10 text-ink"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Info size={18} aria-hidden="true" />
              </Link>

              <Link
                href="/connexion"
                onClick={fermerTousLesMenus}
                className={styleBoutonConnexion}
              >
                Connexion
              </Link>

              <Link
                href="/inscription"
                onClick={fermerTousLesMenus}
                className={styleBoutonRejoindre}
              >
                Rejoindre Kianja
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Menu mobile */}
      {menuMobileOuvert && (
        <div
          id="menu-mobile-public"
          className={clsx(
            "max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden",
            "border-t border-ink/10 bg-paper-light px-4 py-3",
            "lg:hidden",
          )}
        >
          <nav
            aria-label="Navigation mobile publique"
            className="space-y-1"
          >
            <Link
              href={LIEN_ACCUEIL.href}
              onClick={fermerMenuMobile}
              aria-current={accueilActif ? "page" : undefined}
              className={clsx(
                "block min-h-11 rounded-lg px-3 py-3 text-sm font-medium",
                styleFocus,
                accueilActif
                  ? "bg-ink/10 text-ink"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              {LIEN_ACCUEIL.label}
            </Link>

            <GroupeMobile
              menu={MENU_EXPLORER}
              pathname={pathname}
              onNavigate={fermerMenuMobile}
            />

            <Link
              href={LIEN_A_PROPOS.href}
              onClick={fermerMenuMobile}
              aria-current={aProposActif ? "page" : undefined}
              className={clsx(
                "block min-h-11 rounded-lg px-3 py-3 text-sm font-medium",
                styleFocus,
                aProposActif
                  ? "bg-ink/10 text-ink"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              {LIEN_A_PROPOS.label}
            </Link>

            <GroupeMobile
              menu={MENU_AIDE}
              pathname={pathname}
              onNavigate={fermerMenuMobile}
            />

            {!chargement && !utilisateur && (
              <div
                className={clsx(
                  "mt-2 grid grid-cols-1 gap-2",
                  "border-t border-ink/10 pt-3",
                  "min-[400px]:grid-cols-2",
                )}
              >
                <Link
                  href="/connexion"
                  onClick={fermerMenuMobile}
                  className={clsx(styleBoutonConnexion, "w-full")}
                >
                  Connexion
                </Link>

                <Link
                  href="/inscription"
                  onClick={fermerMenuMobile}
                  className={clsx(styleBoutonRejoindre, "w-full")}
                >
                  Rejoindre Kianja
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * Groupe du menu mobile : un titre suivi de ses sous-liens.
 * Les liens restent visibles afin de réduire le nombre de manipulations.
 */
function GroupeMobile({
  menu,
  pathname,
  onNavigate,
}: {
  menu: MenuPublicDeroulant;
  pathname: string;
  onNavigate: () => void;
}) {
  const titreId = `${menu.id}-mobile-titre`;

  return (
    <div role="group" aria-labelledby={titreId} className="py-1">
      <p
        id={titreId}
        className={clsx(
          "px-3 pb-1 pt-2 font-mono text-[0.65rem]",
          "uppercase tracking-[0.2em] text-ink-soft/70",
        )}
      >
        {menu.label}
      </p>

      <ul>
        {menu.elements.map((element) => {
          const Icone = element.icon;
          const actif = cheminCorrespond(pathname, [element.href]);

          return (
            <li key={element.href}>
              <Link
                href={element.href}
                onClick={onNavigate}
                aria-current={actif ? "page" : undefined}
                className={clsx(
                  "flex min-h-11 items-start gap-3 rounded-lg px-3 py-2.5",
                  styleFocus,
                  actif
                    ? "bg-ink/10 text-ink"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Icone
                  size={17}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />

                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {element.label}
                  </span>

                  <span className="block text-xs font-normal text-ink-soft/70">
                    {element.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

import { useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth-context";
import { useNavLabel } from "@/i18n/use-nav-label";
import {
  LIEN_ACCUEIL,
  MENU_EXPLORER,
  cheminCorrespond,
  type MenuPublicDeroulant,
} from "@/lib/navigation-publique";
import { BasculeTheme } from "@/features/theme/components/BasculeTheme";
import { MessagesLink } from "@/features/messagerie/components/MessagesLink";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { MenuDeroulantNav } from "@/components/layout/MenuDeroulantNav";
import { MenuPersonne } from "@/components/layout/MenuPersonne";

/**
 * Un état d'ouverture n'est valable que pour la route sur laquelle il a
 * été posé : dès que `pathname` change, il est ignoré. Cela ferme les
 * menus après navigation sans effet de bord (setState dans un effet).
 */
interface EtatOuverture {
  valeur: string | null;
  chemin: string;
}

export function NavbarPublique() {
  const t = useTranslations("navigation");
  const tn = useNavLabel().label;
  const { utilisateur, chargement } = useAuth();
  const pathname = usePathname();
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
  const navbarRef = useRef<HTMLElement>(null);

  const dropdownOuvert =
    menuOuvert.chemin === pathname ? menuOuvert.valeur : null;
  const menuMobileOuvert =
    menuMobile.chemin === pathname && menuMobile.valeur === "ouvert";
  const menuProfilOuvert =
    menuProfil.chemin === pathname && menuProfil.valeur === "ouvert";

  useEffect(() => {
    function fermerSiClicExterieur(event: PointerEvent) {
      if (!navbarRef.current?.contains(event.target as Node)) {
        setMenuOuvert((etat) => ({ ...etat, valeur: null }));
        setMenuProfil((etat) => ({ ...etat, valeur: null }));
      }
    }

    function fermerAvecEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOuvert((etat) => ({ ...etat, valeur: null }));
        setMenuMobile((etat) => ({ ...etat, valeur: null }));
        setMenuProfil((etat) => ({ ...etat, valeur: null }));
      }
    }

    document.addEventListener("pointerdown", fermerSiClicExterieur);
    document.addEventListener("keydown", fermerAvecEscape);

    return () => {
      document.removeEventListener("pointerdown", fermerSiClicExterieur);
      document.removeEventListener("keydown", fermerAvecEscape);
    };
  }, []);

  function basculerDropdown(id: string, ouvrir: boolean) {
    setMenuOuvert({ valeur: ouvrir ? id : null, chemin: pathname });
    if (ouvrir) setMenuProfil({ valeur: null, chemin: pathname });
  }

  function fermerMenuMobile() {
    setMenuMobile({ valeur: null, chemin: pathname });
  }

  function basculerMenuProfil() {
    setMenuProfil({
      valeur: menuProfilOuvert ? null : "ouvert",
      chemin: pathname,
    });
    setMenuOuvert({ valeur: null, chemin: pathname });
    setMenuMobile({ valeur: null, chemin: pathname });
  }

  function fermerMenuProfil() {
    setMenuProfil({ valeur: null, chemin: pathname });
  }

  const accueilActif = pathname === LIEN_ACCUEIL.href;

  const classeLien = (actif: boolean) =>
    clsx(
      "lien-nav rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      actif
        ? "text-ink font-semibold bg-ink/5"
        : "text-ink-soft hover:bg-ink/5 hover:text-ink",
    );

  return (
    <header
      ref={navbarRef}
      className="fixed inset-x-0 top-0 z-50 h-16 border-b border-ink/10 bg-paper-light"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6">
        <button
          type="button"
          onClick={() => {
            setMenuMobile({
              valeur: menuMobileOuvert ? null : "ouvert",
              chemin: pathname,
            });
            setMenuProfil({ valeur: null, chemin: pathname });
          }}
          aria-label={menuMobileOuvert ? t("publicNav.closeMenu") : t("publicNav.openMenu")}
          aria-expanded={menuMobileOuvert}
          aria-controls="menu-mobile-public"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
        >
          {menuMobileOuvert ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link
          href="/"
          aria-label={t("publicNav.homeAria")}
          className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-kianja.png"
            alt=""
            aria-hidden="true"
            className="h-10 w-10 shrink-0 rounded-xl border border-ink/10 bg-paper-light p-1 object-contain shadow-xs"
          />
          <span className="hidden min-w-0 leading-tight min-[400px]:block">
            <span className="block text-base font-semibold tracking-tight text-ink">
              Kianja
            </span>
            {/* La signature n'apparaît que lorsqu'il y a la place : hors
                plage lg (où la navigation desktop prend l'espace) puis
                de nouveau à partir de xl. */}
            <span className="hidden whitespace-nowrap text-xs text-ink-soft/85 sm:block lg:hidden xl:block font-medium">
              {t("sidebar.signature")}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("publicNav.nav")}
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
        >
          <Link
            href={LIEN_ACCUEIL.href}
            aria-current={accueilActif ? "page" : undefined}
            className={classeLien(accueilActif)}
          >
            {tn(LIEN_ACCUEIL.label)}
          </Link>

          <MenuDeroulantNav
            menu={MENU_EXPLORER}
            ouvert={dropdownOuvert === MENU_EXPLORER.id}
            actif={cheminCorrespond(pathname, MENU_EXPLORER.prefixesActifs)}
            onOuvrirChange={(ouvrir) =>
              basculerDropdown(MENU_EXPLORER.id, ouvrir)
            }
          />

        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <form action="/services" role="search" className="hidden 2xl:block">
            <div className="relative w-56">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/85"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                placeholder={t("publicNav.searchPlaceholder")}
                aria-label={t("publicNav.search")}
                className="kianja-field-control h-9 w-full rounded-full border border-ink/15 bg-paper-light pl-9 pr-3 text-xs text-ink transition-colors hover:border-ink/25 focus:border-ink/40 placeholder:text-ink-soft/85"
              />
            </div>
          </form>

          <Link
            href="/services"
            aria-label={t("publicNav.search")}
            title={t("publicNav.search")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink 2xl:hidden"
          >
            <Search size={18} />
          </Link>

          {!chargement && utilisateur && (
            <>
              <div className="hidden items-center gap-1 sm:flex">
                <MessagesLink />
                <NotificationBell />
              </div>

              <Link
                href="/tableau-de-bord"
                aria-label={tn("Tableau de bord")}
                title={tn("Tableau de bord")}
                className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <LayoutDashboard size={18} />
                <span className="hidden xl:inline">{tn("Tableau de bord")}</span>
              </Link>
            </>
          )}

          {!chargement && !utilisateur && (
            <div className="hidden sm:block">
              <BasculeTheme />
            </div>
          )}

          <MenuPersonne
            ouvert={menuProfilOuvert}
            onBasculer={basculerMenuProfil}
            onFermer={fermerMenuProfil}
          />
        </div>
      </div>

      {menuMobileOuvert && (
        <div
          id="menu-mobile-public"
          className="animate-slide-down kianja-scrollbar-light max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden border-t border-ink/10 bg-paper-light px-4 py-3 lg:hidden"
        >
          <nav aria-label={t("publicNav.mobileNav")} className="space-y-1">
            <Link
              href={LIEN_ACCUEIL.href}
              onClick={fermerMenuMobile}
              aria-current={accueilActif ? "page" : undefined}
              className={clsx(
                "block rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                accueilActif
                  ? "bg-ink/10 text-ink font-semibold"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              {tn(LIEN_ACCUEIL.label)}
            </Link>

            <GroupeMobile
              menu={MENU_EXPLORER}
              pathname={pathname}
              onNavigate={fermerMenuMobile}
            />
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * Groupe du menu mobile : un intitulé suivi de ses sous-liens, toujours
 * visibles (pas de second niveau à ouvrir : un toucher de moins pour
 * atteindre Publications, Freelances, FAQ ou Contact).
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
  const tn = useNavLabel();
  const titreId = `${menu.id}-mobile-titre`;

  return (
    <div role="group" aria-labelledby={titreId} className="py-1">
      <p
        id={titreId}
        className="px-3 pb-1 pt-2 text-xs text-ink-soft/85 font-medium"
      >
        {tn.label(menu.label)}
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
                  "flex min-h-11 items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  actif
                    ? "bg-ink/10 text-ink font-semibold"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Icone
                  size={18}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {tn.label(element.label)}
                  </span>
                  <span className="block text-xs font-normal text-ink-soft/85">
                    {tn.description(element.description)}
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

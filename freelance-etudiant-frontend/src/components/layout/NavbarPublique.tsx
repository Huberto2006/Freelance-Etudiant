"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

import { useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth-context";
import { useLabels } from "@/i18n/use-labels";
import { useNavLabel } from "@/i18n/use-nav-label";
import { getFileUrl } from "@/lib/api";
import {
  LIEN_A_PROPOS,
  LIEN_ACCUEIL,
  MENU_AIDE,
  MENU_EXPLORER,
  cheminCorrespond,
  type MenuPublicDeroulant,
} from "@/lib/navigation-publique";
import { BasculeTheme } from "@/features/theme/components/BasculeTheme";
import { SelecteurLangue } from "@/components/layout/SelecteurLangue";
import { MessagesLink } from "@/features/messagerie/components/MessagesLink";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { MenuDeroulantNav } from "@/components/layout/MenuDeroulantNav";



const styleBoutonConnexion =
  "inline-flex items-center justify-center rounded-lg border border-ink/20 px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-ink/5";

const styleBoutonRejoindre =
  "inline-flex items-center justify-center rounded-lg bg-ink px-3.5 py-1.5 text-sm font-medium text-paper-light transition-colors hover:bg-ink-soft ";

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
  const libelleRole = useLabels().role;
  const { utilisateur, deconnecter, chargement } = useAuth();
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
  }

  const accueilActif = pathname === LIEN_ACCUEIL.href;
  const aProposActif = cheminCorrespond(pathname, [LIEN_A_PROPOS.href]);

  const classeLien = (actif: boolean) =>
    clsx(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
          onClick={() =>
            setMenuMobile({
              valeur: menuMobileOuvert ? null : "ouvert",
              chemin: pathname,
            })
          }
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
            <span className="hidden whitespace-nowrap text-[0.65rem] uppercase tracking-wider text-ink-soft/70 sm:block lg:hidden xl:block">
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

          <MenuDeroulantNav
            menu={MENU_AIDE}
            ouvert={dropdownOuvert === MENU_AIDE.id}
            actif={cheminCorrespond(pathname, MENU_AIDE.prefixesActifs)}
            onOuvrirChange={(ouvrir) =>
              basculerDropdown(MENU_AIDE.id, ouvrir)
            }
          />
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <form action="/services" role="search" className="hidden 2xl:block">
            <div className="relative w-56">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                placeholder={t("publicNav.searchPlaceholder")}
                aria-label={t("publicNav.search")}
                className="kianja-field-control h-9 w-full rounded-full border border-ink/15 bg-paper-light pl-9 pr-3 text-xs text-ink transition-colors hover:border-ink/25 focus:border-ink/40 placeholder:text-ink-soft/50"
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

          {!chargement && utilisateur ? (
            <>
              <div className="hidden items-center gap-1 sm:flex">
                <SelecteurLangue />
                <MessagesLink />
                <NotificationBell />
                <Link
                  href={LIEN_A_PROPOS.href}
                  aria-label={tn(LIEN_A_PROPOS.label)}
                  title={tn(LIEN_A_PROPOS.label)}
                  aria-current={aProposActif ? "page" : undefined}
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                    aProposActif
                      ? "bg-ink/10 text-ink font-semibold"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <Info size={18} aria-hidden="true" />
                </Link>
              </div>

              <Link
                href="/tableau-de-bord"
                className="hidden h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink md:flex"
              >
                <LayoutDashboard size={17} />
                <span className="hidden xl:inline">{tn("Tableau de bord")}</span>
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={basculerMenuProfil}
                  aria-label={t("publicNav.profileMenu")}
                  aria-haspopup="menu"
                  aria-expanded={menuProfilOuvert}
                  className="flex h-9 items-center gap-2 rounded-lg px-2 transition-colors hover:bg-ink/5"
                >
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-ink/15 bg-ink/5 text-ink-soft">
                    {utilisateur.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getFileUrl(utilisateur.photoUrl) ?? undefined}
                        alt={utilisateur.nom}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound size={15} strokeWidth={1.85} />
                    )}
                  </span>
                  <span className="hidden max-w-28 text-left leading-tight sm:block">
                    <span className="block truncate text-xs font-medium text-ink">
                      {utilisateur.nom}
                    </span>
                    <span className="block truncate text-[0.625rem] uppercase tracking-wider text-ink-soft/60">
                      {libelleRole(utilisateur.role)}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    strokeWidth={1.85}
                    className={`hidden text-ink-soft/70 transition-transform duration-150 sm:block ${
                      menuProfilOuvert ? "rotate-180 text-ink" : ""
                    }`}
                  />
                </button>

                {menuProfilOuvert && (
                  <div
                    role="menu"
                    className="animate-pop absolute right-0 top-full mt-2 w-56 origin-top-right overflow-hidden rounded-lg border border-ink/10 bg-paper-light shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)]"
                  >
                    <Link
                      href="/tableau-de-bord"
                      onClick={() =>
                        setMenuProfil({ valeur: null, chemin: pathname })
                      }
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      <LayoutDashboard size={15} strokeWidth={1.85} /> {tn("Tableau de bord")}
                    </Link>
                    <Link
                      href="/tableau-de-bord/profil"
                      onClick={() =>
                        setMenuProfil({ valeur: null, chemin: pathname })
                      }
                      role="menuitem"
                      className="flex items-center gap-3 border-t border-ink/10 px-4 py-3 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      <UserRound size={15} strokeWidth={1.85} /> {tn("Mon profil")}
                    </Link>
                    <button
                      type="button"
                      onClick={deconnecter}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 border-t border-ink/10 px-4 py-3 text-left text-sm text-brique transition-colors hover:bg-brique/5"
                    >
                      <LogOut size={15} strokeWidth={1.85} />
                      {t("sidebar.logout")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={LIEN_A_PROPOS.href}
                aria-label={tn(LIEN_A_PROPOS.label)}
                title={tn(LIEN_A_PROPOS.label)}
                aria-current={aProposActif ? "page" : undefined}
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  aProposActif
                    ? "bg-ink/10 text-ink font-semibold"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Info size={18} strokeWidth={1.85} aria-hidden="true" />
              </Link>
              <SelecteurLangue />
              <BasculeTheme />
              <Link href="/connexion" className={styleBoutonConnexion}>
                <LogIn size={15} strokeWidth={1.85} className="mr-1.5 shrink-0" />
                {tn("Connexion")}
              </Link>
              <Link href="/inscription" className={styleBoutonRejoindre}>
                <UserPlus size={15} strokeWidth={1.85} className="mr-1.5 shrink-0" />
                {tn("Rejoindre Kianja")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {menuMobileOuvert && (
        <div
          id="menu-mobile-public"
          className="animate-slide-down kianja-scrollbar-light max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden border-t border-ink/10 bg-paper-light px-4 py-3 lg:hidden"
        >
          <SelecteurLangue variant="inline" className="pb-3" />
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

            <Link
              href={LIEN_A_PROPOS.href}
              onClick={fermerMenuMobile}
              aria-current={aProposActif ? "page" : undefined}
              className={clsx(
                "block rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                aProposActif
                  ? "bg-ink/10 text-ink font-semibold"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              {tn(LIEN_A_PROPOS.label)}
            </Link>

            <GroupeMobile
              menu={MENU_AIDE}
              pathname={pathname}
              onNavigate={fermerMenuMobile}
            />

            {!chargement && !utilisateur && (
              <div className="mt-2 grid grid-cols-1 gap-2 border-t border-ink/10 pt-3 min-[400px]:grid-cols-2">
                <Link
                  href="/connexion"
                  onClick={fermerMenuMobile}
                  className={clsx(styleBoutonConnexion, "min-h-11 w-full gap-2")}
                >
                  <LogIn size={16} strokeWidth={1.85} />
                  {tn("Connexion")}
                </Link>
                <Link
                  href="/inscription"
                  onClick={fermerMenuMobile}
                  className={clsx(styleBoutonRejoindre, "min-h-11 w-full gap-2")}
                >
                  <UserPlus size={16} strokeWidth={1.85} />
                  {tn("Rejoindre Kianja")}
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
        className="px-3 pb-1 pt-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-soft/70"
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
                  size={17}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {tn.label(element.label)}
                  </span>
                  <span className="block text-xs font-normal text-ink-soft/70">
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

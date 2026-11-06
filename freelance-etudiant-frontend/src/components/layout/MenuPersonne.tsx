"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Globe,
  Heart,
  Info,
  LogIn,
  LogOut,
  UserPlus,
  UserRound,
  UserRoundCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslations } from "next-intl";

import { SelecteurLangue } from "@/components/layout/SelecteurLangue";
import { getFileUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLabels } from "@/i18n/use-labels";
import { LIEN_A_PROPOS } from "@/lib/navigation-publique";

/** Route d'aide existante : la FAQ, première entrée du Centre d'aide. */
const ROUTE_AIDE = "/faq";
const ROUTE_PROFIL = "/tableau-de-bord/profil";

const classeItem =
  "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:bg-ink/5";

const classeTitre =
  "px-3 pb-1 pt-2 text-xs font-semibold text-ink-soft/85";

function Separateur() {
  return <div role="separator" className="my-1.5 h-px bg-ink/10" />;
}

function ItemLien({
  href,
  icone: Icone,
  libelle,
  onNavigate,
}: {
  href: string;
  icone: LucideIcon;
  libelle: string;
  onNavigate: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} role="menuitem" className={classeItem}>
      <Icone size={18} strokeWidth={1.85} aria-hidden="true" className="shrink-0" />
      <span>{libelle}</span>
    </Link>
  );
}

/**
 * Menu de l'icône Personne de la navbar publique (organisation inspirée de
 * ComeUp). L'état d'ouverture appartient à la navbar : elle garantit qu'un
 * seul menu est ouvert à la fois et le referme au clic extérieur, avec
 * Échap et à chaque changement de route.
 */
export function MenuPersonne({
  ouvert,
  onBasculer,
  onFermer,
}: {
  ouvert: boolean;
  onBasculer: () => void;
  onFermer: () => void;
}) {
  const t = useTranslations("navigation");
  const libelleRole = useLabels().role;
  const { utilisateur, deconnecter, chargement } = useAuth();

  // Évite d'afficher le menu visiteur à un utilisateur connecté pendant la
  // restauration de la session (même emplacement, aucun saut de mise en page).
  if (chargement) {
    return <div className="h-9 w-9 shrink-0" aria-hidden="true" />;
  }

  const hrefMoyensPaiement =
    utilisateur?.role === "etudiant"
      ? "/tableau-de-bord/parametres/paiements"
      : utilisateur?.role === "client"
        ? "/tableau-de-bord/parametres/moyens-paiement-client"
        : null;

  function seDeconnecter() {
    onFermer();
    deconnecter();
  }

  return (
    <div className="relative shrink-0">
      {utilisateur ? (
        <button
          type="button"
          onClick={onBasculer}
          aria-label={t("publicNav.profileMenu")}
          aria-haspopup="menu"
          aria-expanded={ouvert}
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
              <UserRound size={16} strokeWidth={1.85} />
            )}
          </span>
          <span className="hidden max-w-28 text-left leading-tight sm:block">
            <span className="block truncate text-xs font-medium text-ink">
              {utilisateur.nom}
            </span>
            <span className="block truncate text-xs text-ink-soft/85 font-medium">
              {libelleRole(utilisateur.role)}
            </span>
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.85}
            className={clsx(
              "hidden text-ink-soft/85 transition-transform duration-150 sm:block",
              ouvert && "rotate-180 text-ink",
            )}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={onBasculer}
          aria-label={t("personMenu.visitorMenu")}
          aria-haspopup="menu"
          aria-expanded={ouvert}
          className={clsx(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink",
            ouvert && "bg-ink/5 text-ink",
          )}
        >
          <UserRound size={18} strokeWidth={1.85} aria-hidden="true" />
        </button>
      )}

      {ouvert && (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-full z-[100] mt-2 max-h-[calc(100dvh-5rem)] w-64 max-w-[calc(100vw-1rem)] origin-top-right overflow-y-auto rounded-xl border border-ink/10 bg-paper-light p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)]"
        >
          {utilisateur ? (
            <>
              <ItemLien
                href={ROUTE_PROFIL}
                icone={UserRound}
                libelle={t("personMenu.myProfile")}
                onNavigate={onFermer}
              />
              <ItemLien
                href={ROUTE_AIDE}
                icone={CircleHelp}
                libelle={t("personMenu.helpCenter")}
                onNavigate={onFermer}
              />

              <Separateur />
              <p className={classeTitre}>{t("personMenu.sectionAccount")}</p>
              <ItemLien
                href={ROUTE_PROFIL}
                icone={UserRoundCog}
                libelle={t("personMenu.myAccount")}
                onNavigate={onFermer}
              />
              <ItemLien
                href="/tableau-de-bord/notifications"
                icone={Bell}
                libelle={t("personMenu.notifications")}
                onNavigate={onFermer}
              />
              {hrefMoyensPaiement && (
                <ItemLien
                  href={hrefMoyensPaiement}
                  icone={Wallet}
                  libelle={t("personMenu.paymentMethods")}
                  onNavigate={onFermer}
                />
              )}
              <ItemLien
                href="/tableau-de-bord/favoris"
                icone={Heart}
                libelle={t("personMenu.favorites")}
                onNavigate={onFermer}
              />

              <Separateur />
              <p className={classeTitre}>{t("personMenu.sectionPreferences")}</p>
              <SelecteurLangue
                variant="ligne"
                libelle={t("personMenu.language")}
                onChoisir={onFermer}
              />

              <Separateur />
              <button
                type="button"
                onClick={seDeconnecter}
                role="menuitem"
                className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-brique transition-colors hover:bg-brique/5 focus-visible:bg-brique/5"
              >
                <LogOut size={18} strokeWidth={1.85} aria-hidden="true" className="shrink-0" />
                <span>{t("personMenu.logout")}</span>
              </button>
            </>
          ) : (
            <>
              <ItemLien
                href="/connexion"
                icone={LogIn}
                libelle={t("personMenu.login")}
                onNavigate={onFermer}
              />
              <ItemLien
                href="/inscription"
                icone={UserPlus}
                libelle={t("personMenu.signup")}
                onNavigate={onFermer}
              />
              <ItemLien
                href={ROUTE_AIDE}
                icone={CircleHelp}
                libelle={t("personMenu.helpCenter")}
                onNavigate={onFermer}
              />
              <ItemLien
                href={LIEN_A_PROPOS.href}
                icone={Info}
                libelle={t("personMenu.about")}
                onNavigate={onFermer}
              />

              <Separateur />
              <p className={clsx(classeTitre, "flex items-center gap-2")}>
                <Globe size={14} strokeWidth={1.85} aria-hidden="true" />
                {t("personMenu.language")}
              </p>
              <SelecteurLangue
                variant="ligne"
                afficherIcone={false}
                onChoisir={onFermer}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

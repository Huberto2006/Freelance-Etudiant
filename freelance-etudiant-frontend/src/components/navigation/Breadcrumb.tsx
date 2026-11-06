"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Ellipsis } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { construireFilAriane, type BreadcrumbItem } from "@/config/navigation/breadcrumbs";
import { useNavLabel } from "@/i18n/use-nav-label";
import { useAuth } from "@/lib/auth-context";

type BreadcrumbScope = "public" | "dashboard";

interface TitreDynamique {
  pathname: string;
  label: string;
}

const BreadcrumbTitleContext = createContext<
  ((titre: TitreDynamique | null) => void) | null
>(null);

export function BreadcrumbTitleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [titreDynamique, setTitreDynamique] =
    useState<TitreDynamique | null>(null);

  return (
    <BreadcrumbTitleContext.Provider value={setTitreDynamique}>
      <TitreDynamiqueContext.Provider value={titreDynamique}>
        {children}
      </TitreDynamiqueContext.Provider>
    </BreadcrumbTitleContext.Provider>
  );
}

const TitreDynamiqueContext = createContext<TitreDynamique | null>(null);

export function useBreadcrumbTitle(label: string | null | undefined) {
  const pathname = usePathname();
  const setTitre = useContext(BreadcrumbTitleContext);
  if (!setTitre) {
    throw new Error(
      "useBreadcrumbTitle doit être utilisé dans BreadcrumbTitleProvider.",
    );
  }

  const titre = label?.trim() || null;

  useEffect(() => {
    setTitre(titre ? { pathname, label: titre } : null);
  }, [pathname, setTitre, titre]);
}

function LienFil({
  item,
  label,
}: {
  item: BreadcrumbItem;
  label: string;
}) {
  if (!item.href) {
    return (
      <span
        aria-current="page"
        className="min-w-0 max-w-64 truncate font-medium text-ink"
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className="rounded-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocre-dark"
    >
      {label}
    </Link>
  );
}

export function Breadcrumb({
  scope,
}: {
  scope: BreadcrumbScope;
}) {
  const pathname = usePathname();
  const { utilisateur } = useAuth();
  const libelleNav = useNavLabel().label;
  const t = useTranslations("navigation.breadcrumb");
  const titreDynamique = useContext(TitreDynamiqueContext);
  const estDashboard = pathname.startsWith("/tableau-de-bord");

  const items = construireFilAriane({
    pathname,
    role: utilisateur?.role,
    dynamicTitle:
      titreDynamique?.pathname === pathname
        ? titreDynamique.label
        : null,
  });

  if ((scope === "dashboard") !== estDashboard || items.length < 2) {
    return null;
  }

  const itemsLibelles = items.map((item) => ({
    ...item,
    label: libelleNav(item.label),
  }));
  const itemCourant = itemsLibelles[itemsLibelles.length - 1];
  const parents = itemsLibelles.slice(0, -1);

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="mx-auto mb-4 w-full max-w-[90rem] text-xs sm:text-sm"
    >
      <ol className="hidden flex-wrap items-center gap-x-2 gap-y-1 sm:flex">
        {itemsLibelles.map((item, index) => (
          <li key={`${item.href ?? "current"}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 && (
              <ChevronRight
                size={14}
                aria-hidden="true"
                className="shrink-0 text-ink/35"
              />
            )}
            <LienFil item={item} label={item.label} />
          </li>
        ))}
      </ol>

      <div className="flex min-w-0 items-center gap-2 sm:hidden">
        {parents.length > 0 && (
          <>
            <details className="group relative shrink-0">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-1 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocre-dark [&::-webkit-details-marker]:hidden">
                <Ellipsis size={16} aria-hidden="true" />
                <span className="sr-only">{t("showParents")}</span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                />
              </summary>
              <ol className="absolute left-0 top-full z-30 mt-1 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-1 rounded-lg border border-ink/10 bg-paper-light p-2 shadow-lg">
                {parents.map((item, index) => (
                  <li key={`${item.href ?? "parent"}-${index}`} className="min-w-0">
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                        }}
                        className="block truncate rounded-md px-2.5 py-2 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ocre-dark"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="block truncate px-2.5 py-2 text-ink-soft">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </details>
            <ChevronRight
              size={14}
              aria-hidden="true"
              className="shrink-0 text-ink/35"
            />
          </>
        )}
        {itemCourant && (
          <span
            aria-current="page"
            className="min-w-0 truncate font-medium text-ink"
          >
            {itemCourant.label}
          </span>
        )}
      </div>
    </nav>
  );
}

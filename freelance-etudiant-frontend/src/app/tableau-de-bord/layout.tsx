"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth-context";
import { liensSidebarParRole } from "@/lib/nav-links";

export default function TableauDeBordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { utilisateur, chargement } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!chargement && !utilisateur) {
      router.replace("/connexion");
    }
  }, [chargement, utilisateur, router]);

  if (chargement || !utilisateur) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm text-ink-soft">Chargement…</p>
      </div>
    );
  }

  const liens = liensSidebarParRole[utilisateur.role];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible border-b md:border-b-0 md:border-l border-ink/15 pb-2 md:pb-0">
            {liens.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className={clsx(
                  "px-3 py-2 text-sm whitespace-nowrap md:border-l-2 -ml-px transition-colors",
                  pathname === lien.href
                    ? "text-ocre-dark font-medium md:border-ocre-dark"
                    : "text-ink-soft hover:text-ink md:border-transparent",
                )}
              >
                {lien.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

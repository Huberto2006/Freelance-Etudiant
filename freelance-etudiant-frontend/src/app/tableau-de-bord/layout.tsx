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
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible pb-2 md:pb-0">
            {liens.map((lien) => {
              const Icon = lien.icon;
              const actif = pathname === lien.href;
              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  className={clsx(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                    actif
                      ? "bg-ocre/10 font-medium text-ocre-dark"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <Icon size={16} strokeWidth={actif ? 2.3 : 2} />
                  {lien.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

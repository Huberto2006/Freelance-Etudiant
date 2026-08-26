"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export default function TableauDeBordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { utilisateur, chargement } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!chargement && !utilisateur) {
      router.replace("/connexion");
    }
  }, [chargement, utilisateur, router]);

  if (chargement || !utilisateur) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm text-ink-soft">
          Chargement…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
      {children}
    </div>
  );
}
"use client";

import { useAuth } from "@/lib/auth-context";

/**
 * Layout dédié au questionnaire de complétion de profil étudiant
 * (ÉTAPE G). Volontairement SANS Navbar ni Sidebar : cet écran ne fait
 * pas partie de la navigation normale du site, il ne s'affiche que
 * juste après l'inscription d'un nouvel étudiant, le temps de
 * compléter les informations obligatoires. Seul un lien de
 * déconnexion minimal est conservé, pour ne pas enfermer la personne.
 */
export default function CompleterProfilLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { deconnecter } = useAuth();

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 pt-6 md:px-8">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Kianja
        </span>
        <button
          type="button"
          onClick={deconnecter}
          className="text-xs font-mono uppercase tracking-wider text-ink-soft transition-colors hover:text-brique"
        >
          Se déconnecter
        </button>
      </div>
      <div className="mx-auto w-full max-w-3xl px-5 py-6 md:px-8 md:py-8">
        {children}
      </div>
    </div>
  );
}


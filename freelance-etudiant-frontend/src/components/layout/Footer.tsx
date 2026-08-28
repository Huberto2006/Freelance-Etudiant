import Link from "next/link";
import { CATEGORIES_REPERENTIEL } from "@/lib/categories";

/**
 * Pied de page de la plateforme : presentation de la marque, liens
 * d'exploration, categories populaires et acces au compte, avec une
 * barre de mention en bas. Entierement dans l'identite Kianja.
 */
export function Footer() {
  const annee = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-ink/15 bg-paper-light/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* ------------------------------- MARQUE */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-rice font-mono text-[10px] font-bold text-rice"
              aria-hidden="true"
            >
              K
            </span>
            <span className="font-display text-lg font-semibold">Kianja</span>
          </div>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            La place de marche qui connecte les étudiants freelances aux
            clients, à Fianarantsoa et au-delà.
          </p>

          <p className="mt-4 font-mono text-xs text-ink-soft/60">
            Projet L3 Informatique — EMIT Fianarantsoa
          </p>
        </div>

        {/* ------------------------------- EXPLORER */}
        <nav aria-label="Explorer la plateforme">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
            Explorer
          </p>

          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: "/missions", label: "Missions ouvertes" },
              { href: "/services", label: "Services étudiants" },
              { href: "/tableau-de-bord", label: "Tableau de bord" },
            ].map((lien) => (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  className="text-ink-soft transition-colors hover:text-ocre-dark"
                >
                  {lien.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ------------------------------- CATEGORIES */}
        <nav aria-label="Catégories de services">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
            Catégories
          </p>

          <ul className="mt-4 space-y-2.5 text-sm">
            {CATEGORIES_REPERENTIEL.slice(0, 5).map((categorie) => (
              <li key={categorie.valeur}>
                <Link
                  href={`/services?categorie=${encodeURIComponent(categorie.valeur)}`}
                  className="text-ink-soft transition-colors hover:text-ocre-dark"
                >
                  {categorie.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ------------------------------- VOTRE COMPTE */}
        <nav aria-label="Votre compte">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
            Votre compte
          </p>

          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: "/connexion", label: "Se connecter" },
              { href: "/inscription", label: "Créer un compte" },
              {
                href: "/tableau-de-bord/candidatures",
                label: "Mes candidatures",
              },
              {
                href: "/tableau-de-bord/mes-services",
                label: "Mes services",
              },
              { href: "/tableau-de-bord/messages", label: "Messages" },
            ].map((lien) => (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  className="text-ink-soft transition-colors hover:text-ocre-dark"
                >
                  {lien.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ------------------------------- MENTIONS */}
      <div className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-ink-soft/70 sm:flex-row">
          <p>
            © {annee} Kianja — Freelances étudiants × Clients
          </p>
          <p className="font-mono">Fianarantsoa · Madagascar</p>
        </div>
      </div>
    </footer>
  );
}

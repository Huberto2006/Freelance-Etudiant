import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { NoticeCard, Tag } from "@/components/ui/Notice";
import { fetchPublic } from "@/lib/api-server";
import { formatArgent } from "@/lib/format";
import type { Mission, ServiceOffert } from "@/lib/types";

export default async function AccueilPage() {
  const [missions, services] = await Promise.all([
    fetchPublic<Mission[]>("/missions"),
    fetchPublic<ServiceOffert[]>("/services"),
  ]);

  const missionsAffichees = (missions ?? []).slice(0, 3);
  const servicesAffiches = (services ?? []).slice(0, 3);

  return (
    <div>
      {/* --- Hero --- */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark mb-5">
              EMIT Fianarantsoa — place de marche des freelances
            </p>
            <h1 className="font-display text-5xl sm:text-6xl font-semibold leading-[1.05] text-ink">
              Le kianja où les étudiants{" "}
              <span className="text-rice">affichent leur talent</span> et les
              clients épinglent leurs besoins.
            </h1>
            <p className="mt-6 text-lg text-ink-soft max-w-xl">
              Kianja connecte les étudiants freelances de l&apos;EMIT à des clients
              locaux : missions ponctuelles, services à la carte, paiement
              clair, réputation vérifiée à chaque projet livré.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/inscription?role=client">
                <Button variant="primary" size="lg">
                  Publier une mission
                </Button>
              </Link>
              <Link href="/inscription?role=etudiant">
                <Button variant="ghost" size="lg">
                  Proposer mes services
                </Button>
              </Link>
            </div>
          </div>

          {/* Mosaique de notices, illustration du concept */}
          <div className="relative hidden sm:block">
            <div className="grid grid-cols-2 gap-5">
              <NoticeCard className="col-span-2 -rotate-1">
                <Tag tone="rice">Mission</Tag>
                <p className="mt-3 font-display text-lg font-medium">
                  Développement plateforme scolaire
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Next.js · NestJS · PostgreSQL
                </p>
                <p className="mt-3 font-mono text-sm text-ocre-dark">
                  {formatArgent(1500000)}
                </p>
              </NoticeCard>
              <NoticeCard className="rotate-1">
                <Tag tone="ocre">Service</Tag>
                <p className="mt-3 font-display text-base font-medium">
                  Maquette UI/UX Figma
                </p>
                <p className="mt-3 font-mono text-sm text-ocre-dark">
                  {formatArgent(80000)}
                </p>
              </NoticeCard>
              <NoticeCard className="-rotate-2">
                <Tag tone="brique">Urgent</Tag>
                <p className="mt-3 font-display text-base font-medium">
                  Rédaction de contenu
                </p>
                <p className="mt-3 font-mono text-sm text-ocre-dark">
                  {formatArgent(45000)}
                </p>
              </NoticeCard>
            </div>
          </div>
        </div>
      </section>

      {/* --- Comment ca marche --- */}
      <section className="border-y border-ink/15 bg-ink/[0.03]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-2xl font-semibold mb-10">
            Comment ça marche
          </h2>
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-rice mb-4">
                Côté client
              </p>
              <ol className="space-y-5">
                {[
                  "Publiez votre mission avec budget et compétences requises",
                  "Recevez des candidatures, comparez les profils et scores",
                  "Validez la livraison et notez le travail",
                ].map((etape, i) => (
                  <li key={etape} className="flex gap-4">
                    <span className="font-mono text-sm text-ink-soft/60 w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-ink-soft">{etape}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ocre-dark mb-4">
                Côté étudiant
              </p>
              <ol className="space-y-5">
                {[
                  "Publiez vos services ou postulez aux missions ouvertes",
                  "Discutez des détails et livrez votre travail",
                  "Construisez votre score de réputation à chaque projet",
                ].map((etape, i) => (
                  <li key={etape} className="flex gap-4">
                    <span className="font-mono text-sm text-ink-soft/60 w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-ink-soft">{etape}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* --- Missions recentes --- */}
      {missionsAffichees.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl font-semibold">
              Sur le panneau en ce moment
            </h2>
            <Link
              href="/missions"
              className="text-sm text-ocre-dark hover:underline"
            >
              Voir toutes les missions →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {missionsAffichees.map((mission) => (
              <Link key={mission.id} href={`/missions/${mission.id}`}>
                <NoticeCard className="h-full">
                  <Tag tone="rice">{mission.categorie}</Tag>
                  <p className="mt-3 font-display text-lg font-medium line-clamp-2">
                    {mission.titre}
                  </p>
                  <p className="mt-3 font-mono text-sm text-ocre-dark">
                    {formatArgent(mission.budget)}
                  </p>
                </NoticeCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* --- Services recents --- */}
      {servicesAffiches.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl font-semibold">
              Talents disponibles
            </h2>
            <Link
              href="/services"
              className="text-sm text-ocre-dark hover:underline"
            >
              Voir tous les services →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {servicesAffiches.map((service) => (
              <Link key={service.id} href={`/services/${service.id}`}>
                <NoticeCard className="h-full">
                  <Tag tone="ocre">{service.categorie}</Tag>
                  <p className="mt-3 font-display text-lg font-medium line-clamp-2">
                    {service.titre}
                  </p>
                  <p className="mt-3 font-mono text-sm text-ocre-dark">
                    {formatArgent(service.prix)}
                  </p>
                </NoticeCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* --- CTA final --- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="bg-ink text-paper-light px-8 py-14 sm:px-14 text-center">
          <h2 className="font-display text-3xl font-semibold">
            Prêt à épingler votre première annonce ?
          </h2>
          <p className="mt-3 text-paper-light/70 max-w-xl mx-auto">
            Inscription gratuite, en moins de deux minutes.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/inscription">
              <Button variant="secondary" size="lg">
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

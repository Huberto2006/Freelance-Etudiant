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

  // Données utilisées dans la mosaïque du Hero
  const missionHero = missions?.[0] ?? null;
  const serviceHero = services?.[0] ?? null;
  const missionHero2 = missions?.[1] ?? null;

  return (
    <div>
      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          
          {/* ----------------------------------------------------- */}
          {/* Texte du Hero */}
          {/* ----------------------------------------------------- */}
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-ocre-dark">
              EMIT Fianarantsoa — place de marché des freelances
            </p>

            <h1 className="font-display text-5xl font-semibold leading-[1.05] text-ink sm:text-6xl">
              Le kianja où les étudiants{" "}
              <span className="text-rice">affichent leur talent</span> et les
              clients épinglent leurs besoins.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-ink-soft">
              Kianja connecte les étudiants freelances de l&apos;EMIT à des
              clients locaux : missions ponctuelles, services à la carte,
              paiement clair, réputation vérifiée à chaque projet livré.
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

          {/* ----------------------------------------------------- */}
          {/* Mosaïque dynamique */}
          {/* ----------------------------------------------------- */}
          <div className="relative hidden sm:block">
            <div className="grid grid-cols-2 gap-5">

              {/* ===================== */}
              {/* Mission principale */}
              {/* ===================== */}
              {missionHero ? (
                <Link
                  href={`/missions/${missionHero.id}`}
                  className="col-span-2 block"
                >
                  <NoticeCard className="h-full -rotate-1 transition-transform duration-200 hover:-translate-y-1 hover:rotate-0">
                    <Tag tone="rice">Mission</Tag>

                    <p className="mt-3 line-clamp-2 font-display text-lg font-medium">
                      {missionHero.titre}
                    </p>

                    <p className="mt-2 line-clamp-1 text-sm text-ink-soft">
                      {missionHero.categorie}
                    </p>

                    <p className="mt-3 font-mono text-sm text-ocre-dark">
                      {formatArgent(missionHero.budget)}
                    </p>
                  </NoticeCard>
                </Link>
              ) : (
                <NoticeCard className="col-span-2 -rotate-1">
                  <Tag tone="rice">Mission</Tag>

                  <p className="mt-3 font-display text-lg font-medium">
                    Aucune mission disponible
                  </p>

                  <p className="mt-2 text-sm text-ink-soft">
                    Les nouvelles missions apparaîtront ici.
                  </p>
                </NoticeCard>
              )}

              {/* ===================== */}
              {/* Premier service */}
              {/* ===================== */}
              {serviceHero ? (
                <Link
                  href={`/services/${serviceHero.id}`}
                  className="block h-full"
                >
                  <NoticeCard className="h-full rotate-1 transition-transform duration-200 hover:-translate-y-1 hover:rotate-0">
                    <Tag tone="ocre">Service</Tag>

                    <p className="mt-3 line-clamp-2 font-display text-base font-medium">
                      {serviceHero.titre}
                    </p>

                    <p className="mt-2 line-clamp-1 text-sm text-ink-soft">
                      {serviceHero.categorie}
                    </p>

                    <p className="mt-3 font-mono text-sm text-ocre-dark">
                      {formatArgent(serviceHero.prix)}
                    </p>
                  </NoticeCard>
                </Link>
              ) : (
                <NoticeCard className="h-full rotate-1">
                  <Tag tone="ocre">Service</Tag>

                  <p className="mt-3 font-display text-base font-medium">
                    Aucun service disponible
                  </p>

                  <p className="mt-2 text-sm text-ink-soft">
                    Les services des étudiants apparaîtront ici.
                  </p>
                </NoticeCard>
              )}

              {/* ===================== */}
              {/* Deuxième mission */}
              {/* ===================== */}
              {missionHero2 ? (
                <Link
                  href={`/missions/${missionHero2.id}`}
                  className="block h-full"
                >
                  <NoticeCard className="h-full -rotate-2 transition-transform duration-200 hover:-translate-y-1 hover:rotate-0">
                    <Tag tone="brique">Mission</Tag>

                    <p className="mt-3 line-clamp-2 font-display text-base font-medium">
                      {missionHero2.titre}
                    </p>

                    <p className="mt-2 line-clamp-1 text-sm text-ink-soft">
                      {missionHero2.categorie}
                    </p>

                    <p className="mt-3 font-mono text-sm text-ocre-dark">
                      {formatArgent(missionHero2.budget)}
                    </p>
                  </NoticeCard>
                </Link>
              ) : (
                <NoticeCard className="h-full -rotate-2">
                  <Tag tone="brique">Kianja</Tag>

                  <p className="mt-3 font-display text-base font-medium">
                    Trouvez votre prochaine opportunité
                  </p>

                  <p className="mt-2 text-sm text-ink-soft">
                    Missions et services étudiants.
                  </p>
                </NoticeCard>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* COMMENT ÇA MARCHE */}
      {/* ========================================================= */}
      <section className="border-y border-ink/15 bg-ink/[0.03]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="mb-10 font-display text-2xl font-semibold">
            Comment ça marche
          </h2>

          <div className="grid gap-10 sm:grid-cols-2">

            {/* Côté client */}
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-rice">
                Côté client
              </p>

              <ol className="space-y-5">
                {[
                  "Publiez votre mission avec budget et compétences requises",
                  "Recevez des candidatures, comparez les profils et scores",
                  "Validez la livraison et notez le travail",
                ].map((etape, i) => (
                  <li key={etape} className="flex gap-4">
                    <span className="w-5 shrink-0 font-mono text-sm text-ink-soft/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <span className="text-sm text-ink-soft">
                      {etape}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Côté étudiant */}
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ocre-dark">
                Côté étudiant
              </p>

              <ol className="space-y-5">
                {[
                  "Publiez vos services ou postulez aux missions ouvertes",
                  "Discutez des détails et livrez votre travail",
                  "Construisez votre score de réputation à chaque projet",
                ].map((etape, i) => (
                  <li key={etape} className="flex gap-4">
                    <span className="w-5 shrink-0 font-mono text-sm text-ink-soft/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <span className="text-sm text-ink-soft">
                      {etape}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* MISSIONS RÉCENTES */}
      {/* ========================================================= */}
      {missionsAffichees.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 flex items-baseline justify-between">
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
              <Link
                key={mission.id}
                href={`/missions/${mission.id}`}
                className="block h-full"
              >
                <NoticeCard className="h-full transition-transform duration-200 hover:-translate-y-1">
                  <Tag tone="rice">
                    {mission.categorie}
                  </Tag>

                  <p className="mt-3 line-clamp-2 font-display text-lg font-medium">
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

      {/* ========================================================= */}
      {/* SERVICES RÉCENTS */}
      {/* ========================================================= */}
      {servicesAffiches.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 flex items-baseline justify-between">
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
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                className="block h-full"
              >
                <NoticeCard className="h-full transition-transform duration-200 hover:-translate-y-1">
                  <Tag tone="ocre">
                    {service.categorie}
                  </Tag>

                  <p className="mt-3 line-clamp-2 font-display text-lg font-medium">
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

      {/* ========================================================= */}
      {/* CTA FINAL */}
      {/* ========================================================= */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="bg-ink px-8 py-14 text-center text-paper-light sm:px-14">
          <h2 className="font-display text-3xl font-semibold">
            Prêt à épingler votre première annonce ?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-paper-light/70">
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
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Google OAuth/OIDC + profil progressif.
 *
 * 1. Table "utilisateurs" :
 *    - nouveau type enum "utilisateurs_auth_provider_enum" (LOCAL | GOOGLE) ;
 *    - "auth_provider" NOT NULL DEFAULT 'LOCAL' : tous les comptes
 *      pre-existants restent des comptes locaux email + mot de passe,
 *      leur connexion n'est pas alteree ;
 *    - "google_id" nullable + index UNIQUE partiel (WHERE google_id IS NOT
 *      NULL) : plusieurs comptes locaux sans Google peuvent coexister,
 *      deux comptes ne peuvent JAMAIS partager le meme identifiant Google ;
 *    - "profil_complete" NOT NULL DEFAULT false : determine exclusivement
 *      cote backend (ProfileCompletionService) ;
 *    - "derniere_connexion" nullable ;
 *    - type enum "utilisateurs_role_enum" etendu avec 'a_definir' :
 *      valeur transitoire des nouveaux comptes Google tant que le role
 *      n'a pas ete choisi explicitement (ecran /choix-role). Aucune
 *      donnee existante n'est modifiee.
 *
 * 2. Table "profils_etudiants" : champs de profil supplementaires
 *    (filiere, annee_etude, ville, telephone, specialites, experience,
 *    type_freelance, statut_disponibilite, tarif_minimum, tarif_maximum,
 *    github_url, gitlab_url, linkedin_url, site_web). Tous nullable ou
 *    avec valeur par defaut neutre : aucune ligne existante n'est alteree.
 *
 * 3. Table "profils_clients" : secteur_activite, description, ville,
 *    telephone, site_web, budget_min, budget_max, types_projets,
 *    besoins_freelance, nombre_projets. Meme politique.
 *
 * down() supprime exactement ce qui a ete ajoute, sans jamais toucher
 * aux donnees metier (missions, services, paiements, etc.).
 */
export class AddGoogleAuthEtProfilProgressif1804000000000
  implements MigrationInterface
{
  name = 'AddGoogleAuthEtProfilProgressif1804000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Utilisateurs : authentification Google ----
    await queryRunner.query(
      `CREATE TYPE "public"."utilisateurs_auth_provider_enum" AS ENUM('LOCAL', 'GOOGLE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs"
        ADD "auth_provider" "public"."utilisateurs_auth_provider_enum" NOT NULL DEFAULT 'LOCAL',
        ADD "google_id" character varying(255),
        ADD "profil_complete" boolean NOT NULL DEFAULT false,
        ADD "derniere_connexion" TIMESTAMP WITH TIME ZONE`,
    );
    // Unicite du google_id uniquement lorsqu'il est present (les comptes
    // locaux ont google_id NULL et ne doivent pas entrer en conflit).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_utilisateurs_google_id" ON "utilisateurs" ("google_id") WHERE "google_id" IS NOT NULL`,
    );

    // Extension de l'enum role avec la valeur transitoire 'a_definir'.
    await queryRunner.query(
      `ALTER TYPE "public"."utilisateurs_role_enum" ADD VALUE IF NOT EXISTS 'a_definir' AFTER 'admin'`,
    );

    // ---- Profils etudiants ----
    await queryRunner.query(
      `ALTER TABLE "profils_etudiants"
        ADD "filiere" character varying(150),
        ADD "annee_etude" character varying(20),
        ADD "ville" character varying(100),
        ADD "telephone" character varying(30),
        ADD "specialites" text array NOT NULL DEFAULT '{}',
        ADD "experience" integer NOT NULL DEFAULT 0,
        ADD "type_freelance" character varying(50),
        ADD "statut_disponibilite" character varying(50),
        ADD "tarif_minimum" numeric(10,2),
        ADD "tarif_maximum" numeric(10,2),
        ADD "github_url" character varying(500),
        ADD "gitlab_url" character varying(500),
        ADD "linkedin_url" character varying(500),
        ADD "site_web" character varying(500)`,
    );

    // ---- Profils clients ----
    await queryRunner.query(
      `ALTER TABLE "profils_clients"
        ADD "secteur_activite" character varying(100),
        ADD "description" text,
        ADD "ville" character varying(100),
        ADD "telephone" character varying(30),
        ADD "site_web" character varying(500),
        ADD "budget_min" numeric(12,2),
        ADD "budget_max" numeric(12,2),
        ADD "types_projets" text array NOT NULL DEFAULT '{}',
        ADD "besoins_freelance" text array NOT NULL DEFAULT '{}',
        ADD "nombre_projets" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note PostgreSQL : une valeur d'enum ne peut pas etre retiree ; on
    // recree le type role avec ses 3 valeurs d'origine. Les lignes
    // portant role = 'a_definir' (normalement aucune au moment du
    // rollback) sont repositionnees sur 'etudiant' pour eviter un cast
    // invalide.
    await queryRunner.query(
      `UPDATE "utilisateurs" SET "role" = 'etudiant' WHERE "role" = 'a_definir'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."utilisateurs_role_enum_old" AS ENUM('etudiant', 'client', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ALTER COLUMN "role" TYPE "public"."utilisateurs_role_enum_old" USING "role"::text::"public"."utilisateurs_role_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."utilisateurs_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."utilisateurs_role_enum_old" RENAME TO "utilisateurs_role_enum"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_utilisateurs_google_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs"
        DROP COLUMN "derniere_connexion",
        DROP COLUMN "profil_complete",
        DROP COLUMN "google_id",
        DROP COLUMN "auth_provider"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."utilisateurs_auth_provider_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "profils_etudiants"
        DROP COLUMN "site_web",
        DROP COLUMN "linkedin_url",
        DROP COLUMN "gitlab_url",
        DROP COLUMN "github_url",
        DROP COLUMN "tarif_maximum",
        DROP COLUMN "tarif_minimum",
        DROP COLUMN "statut_disponibilite",
        DROP COLUMN "type_freelance",
        DROP COLUMN "experience",
        DROP COLUMN "specialites",
        DROP COLUMN "telephone",
        DROP COLUMN "ville",
        DROP COLUMN "annee_etude",
        DROP COLUMN "filiere"`,
    );

    await queryRunner.query(
      `ALTER TABLE "profils_clients"
        DROP COLUMN "nombre_projets",
        DROP COLUMN "besoins_freelance",
        DROP COLUMN "types_projets",
        DROP COLUMN "budget_max",
        DROP COLUMN "budget_min",
        DROP COLUMN "site_web",
        DROP COLUMN "telephone",
        DROP COLUMN "ville",
        DROP COLUMN "description",
        DROP COLUMN "secteur_activite"`,
    );
  }
}
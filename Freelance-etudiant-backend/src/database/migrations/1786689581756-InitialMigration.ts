import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1786689581756 implements MigrationInterface {
    name = 'InitialMigration1786689581756'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "titre" character varying(100) NOT NULL, "description" text NOT NULL, "categorie" character varying(50) NOT NULL, "prix" numeric(10,2) NOT NULL, "delai" integer NOT NULL, "competences" text array NOT NULL DEFAULT '{}', "images_urls" text array NOT NULL DEFAULT '{}', "disponible" boolean NOT NULL DEFAULT true, "est_modere" boolean NOT NULL DEFAULT true, "etudiant_id" uuid NOT NULL, "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id")); COMMENT ON COLUMN "services"."delai" IS 'delai de realisation en jours'`);
        await queryRunner.query(`CREATE TYPE "public"."profils_clients_type_client_enum" AS ENUM('particulier', 'entreprise')`);
        await queryRunner.query(`CREATE TABLE "profils_clients" ("utilisateur_id" uuid NOT NULL, "type_client" "public"."profils_clients_type_client_enum" NOT NULL DEFAULT 'particulier', "nom_entreprise" character varying(150), CONSTRAINT "PK_9c1f53e9c85095dd2655515b23c" PRIMARY KEY ("utilisateur_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."missions_statut_enum" AS ENUM('ouverte', 'en_cours', 'terminee', 'fermee')`);
        await queryRunner.query(`CREATE TABLE "missions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "titre" character varying(100) NOT NULL, "description" text NOT NULL, "budget" numeric(10,2) NOT NULL, "date_limite" date NOT NULL, "categorie" character varying(50) NOT NULL, "competences_requises" text array NOT NULL DEFAULT '{}', "statut" "public"."missions_statut_enum" NOT NULL DEFAULT 'ouverte', "est_modere" boolean NOT NULL DEFAULT true, "client_id" uuid NOT NULL, "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_787aebb1ac5923c9904043c6309" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "note" integer NOT NULL, "commentaire" text, "livraison_id" uuid NOT NULL, "evaluateur_id" uuid NOT NULL, "evalue_id" uuid NOT NULL, "date_evaluation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f683b433eba0e6dae7e19b29e29" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."livraisons_statut_enum" AS ENUM('en_attente', 'validee', 'correction_demandee')`);
        await queryRunner.query(`CREATE TABLE "livraisons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "candidature_id" uuid NOT NULL, "fichier_url" character varying(500), "lien_livrable" character varying(500), "commentaireLivraison" text, "statut" "public"."livraisons_statut_enum" NOT NULL DEFAULT 'en_attente', "commentaire_correction" text, "date_livraison" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_b48ed7bb0c4c93e4b3dbd38a60" UNIQUE ("candidature_id"), CONSTRAINT "PK_7993e6d1fbfc401efb3942270da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."candidatures_statut_enum" AS ENUM('en_attente', 'acceptee', 'refusee')`);
        await queryRunner.query(`CREATE TABLE "candidatures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "prix_propose" numeric(10,2) NOT NULL, "delai_propose" integer NOT NULL, "message" text, "statut" "public"."candidatures_statut_enum" NOT NULL DEFAULT 'en_attente', "mission_id" uuid NOT NULL, "etudiant_id" uuid NOT NULL, "date_candidature" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_candidature_mission_etudiant" UNIQUE ("mission_id", "etudiant_id"), CONSTRAINT "PK_3d3816f972665a5f0b67e0fbf7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "profils_etudiants" ("utilisateur_id" uuid NOT NULL, "niveau_etude" character varying(50), "universite" character varying(150), "competences" text array NOT NULL DEFAULT '{}', "langues" text array NOT NULL DEFAULT '{}', "tarif_horaire" numeric(10,2), "disponibilite" boolean NOT NULL DEFAULT true, "description" text, "portfolio_urls" text array NOT NULL DEFAULT '{}', "score_reputation" numeric(5,2) NOT NULL DEFAULT '0', "note_moyenne" numeric(3,2) NOT NULL DEFAULT '0', "nombre_missions_terminees" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_67abf56c8e76fc5542607a40456" PRIMARY KEY ("utilisateur_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."utilisateurs_role_enum" AS ENUM('etudiant', 'client', 'admin')`);
        await queryRunner.query(`CREATE TABLE "utilisateurs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nom" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "mot_de_passe" character varying(255) NOT NULL, "role" "public"."utilisateurs_role_enum" NOT NULL, "photo_url" character varying(500), "est_actif" boolean NOT NULL DEFAULT true, "est_suspendu" boolean NOT NULL DEFAULT false, "date_inscription" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6b14325a486fe68d16aa889e4dc" UNIQUE ("email"), CONSTRAINT "PK_d3c39b551c51a0bdc76e07b9197" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6b14325a486fe68d16aa889e4d" ON "utilisateurs" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."signalements_cible_type_enum" AS ENUM('utilisateur', 'service', 'mission')`);
        await queryRunner.query(`CREATE TYPE "public"."signalements_statut_enum" AS ENUM('ouvert', 'en_cours', 'traite')`);
        await queryRunner.query(`CREATE TABLE "signalements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "motif" character varying(100) NOT NULL, "description" text NOT NULL, "cible_type" "public"."signalements_cible_type_enum" NOT NULL, "cible_id" uuid NOT NULL, "statut" "public"."signalements_statut_enum" NOT NULL DEFAULT 'ouvert', "signale_par_id" uuid NOT NULL, "traite_par_id" uuid, "resolution" text, "date_signalement" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date_traitement" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_dbcf62fb66b5cf2a0e673c7dcd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contenu" text NOT NULL, "expediteur_id" uuid NOT NULL, "destinataire_id" uuid NOT NULL, "mission_id" uuid, "est_lu" boolean NOT NULL DEFAULT false, "date_envoi" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_daf93631167257f34bb6cf07822" FOREIGN KEY ("etudiant_id") REFERENCES "profils_etudiants"("utilisateur_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "profils_clients" ADD CONSTRAINT "FK_9c1f53e9c85095dd2655515b23c" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "missions" ADD CONSTRAINT "FK_87cbde142f7da76d8331da19fee" FOREIGN KEY ("client_id") REFERENCES "profils_clients"("utilisateur_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluations" ADD CONSTRAINT "FK_37dd704eeebd39c50d9cf7e60ba" FOREIGN KEY ("livraison_id") REFERENCES "livraisons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluations" ADD CONSTRAINT "FK_e586f31665185492fa0f2275418" FOREIGN KEY ("evaluateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluations" ADD CONSTRAINT "FK_8bd60bdea9f0e78cc43801a2cef" FOREIGN KEY ("evalue_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "livraisons" ADD CONSTRAINT "FK_b48ed7bb0c4c93e4b3dbd38a601" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "candidatures" ADD CONSTRAINT "FK_010af293de01e6995d89c397ddf" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "candidatures" ADD CONSTRAINT "FK_cf7620bed89e5ccf48bf7dc164e" FOREIGN KEY ("etudiant_id") REFERENCES "profils_etudiants"("utilisateur_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "profils_etudiants" ADD CONSTRAINT "FK_67abf56c8e76fc5542607a40456" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "signalements" ADD CONSTRAINT "FK_5b014496cb4aa5e044419dc284e" FOREIGN KEY ("signale_par_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "signalements" ADD CONSTRAINT "FK_1b6f6ba8607154995f67be4f8a1" FOREIGN KEY ("traite_par_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_7cbee8efe3effa416e9627211c4" FOREIGN KEY ("expediteur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_5e6486e477a8df81e3784206c80" FOREIGN KEY ("destinataire_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_ca3bc799cc6a358ba3d939621ff" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_ca3bc799cc6a358ba3d939621ff"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_5e6486e477a8df81e3784206c80"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_7cbee8efe3effa416e9627211c4"`);
        await queryRunner.query(`ALTER TABLE "signalements" DROP CONSTRAINT "FK_1b6f6ba8607154995f67be4f8a1"`);
        await queryRunner.query(`ALTER TABLE "signalements" DROP CONSTRAINT "FK_5b014496cb4aa5e044419dc284e"`);
        await queryRunner.query(`ALTER TABLE "profils_etudiants" DROP CONSTRAINT "FK_67abf56c8e76fc5542607a40456"`);
        await queryRunner.query(`ALTER TABLE "candidatures" DROP CONSTRAINT "FK_cf7620bed89e5ccf48bf7dc164e"`);
        await queryRunner.query(`ALTER TABLE "candidatures" DROP CONSTRAINT "FK_010af293de01e6995d89c397ddf"`);
        await queryRunner.query(`ALTER TABLE "livraisons" DROP CONSTRAINT "FK_b48ed7bb0c4c93e4b3dbd38a601"`);
        await queryRunner.query(`ALTER TABLE "evaluations" DROP CONSTRAINT "FK_8bd60bdea9f0e78cc43801a2cef"`);
        await queryRunner.query(`ALTER TABLE "evaluations" DROP CONSTRAINT "FK_e586f31665185492fa0f2275418"`);
        await queryRunner.query(`ALTER TABLE "evaluations" DROP CONSTRAINT "FK_37dd704eeebd39c50d9cf7e60ba"`);
        await queryRunner.query(`ALTER TABLE "missions" DROP CONSTRAINT "FK_87cbde142f7da76d8331da19fee"`);
        await queryRunner.query(`ALTER TABLE "profils_clients" DROP CONSTRAINT "FK_9c1f53e9c85095dd2655515b23c"`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_daf93631167257f34bb6cf07822"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "signalements"`);
        await queryRunner.query(`DROP TYPE "public"."signalements_statut_enum"`);
        await queryRunner.query(`DROP TYPE "public"."signalements_cible_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b14325a486fe68d16aa889e4d"`);
        await queryRunner.query(`DROP TABLE "utilisateurs"`);
        await queryRunner.query(`DROP TYPE "public"."utilisateurs_role_enum"`);
        await queryRunner.query(`DROP TABLE "profils_etudiants"`);
        await queryRunner.query(`DROP TABLE "candidatures"`);
        await queryRunner.query(`DROP TYPE "public"."candidatures_statut_enum"`);
        await queryRunner.query(`DROP TABLE "livraisons"`);
        await queryRunner.query(`DROP TYPE "public"."livraisons_statut_enum"`);
        await queryRunner.query(`DROP TABLE "evaluations"`);
        await queryRunner.query(`DROP TABLE "missions"`);
        await queryRunner.query(`DROP TYPE "public"."missions_statut_enum"`);
        await queryRunner.query(`DROP TABLE "profils_clients"`);
        await queryRunner.query(`DROP TYPE "public"."profils_clients_type_client_enum"`);
        await queryRunner.query(`DROP TABLE "services"`);
    }

}

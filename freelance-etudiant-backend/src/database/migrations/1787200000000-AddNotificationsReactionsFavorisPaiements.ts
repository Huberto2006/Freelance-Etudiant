import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationsReactionsFavorisPaiements1787200000000
  implements MigrationInterface
{
  name = "AddNotificationsReactionsFavorisPaiements1787200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mot de passe oublie
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ADD "reset_password_token" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ADD "reset_password_expire" TIMESTAMP WITH TIME ZONE`,
    );

    // Notifications
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('nouvelle_candidature', 'candidature_acceptee', 'candidature_refusee', 'nouveau_message', 'livraison_deposee', 'livraison_validee', 'correction_demandee', 'nouvelle_evaluation', 'paiement_initie', 'paiement_confirme', 'paiement_libere', 'nouvelle_reaction')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."notifications_type_enum" NOT NULL, "titre" character varying(150) NOT NULL, "message" text NOT NULL, "lien_url" character varying(300), "est_lue" boolean NOT NULL DEFAULT false, "destinataire_id" uuid NOT NULL, "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_destinataire" ON "notifications" ("destinataire_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_est_lue" ON "notifications" ("est_lue")`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_destinataire" FOREIGN KEY ("destinataire_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Reactions de profil
    await queryRunner.query(
      `CREATE TABLE "reactions_profil" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "auteur_id" uuid NOT NULL, "cible_id" uuid NOT NULL, "date_reaction" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_reaction_auteur_cible" UNIQUE ("auteur_id", "cible_id"), CONSTRAINT "PK_reactions_profil_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reactions_profil" ADD CONSTRAINT "FK_reactions_auteur" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reactions_profil" ADD CONSTRAINT "FK_reactions_cible" FOREIGN KEY ("cible_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Favoris
    await queryRunner.query(
      `CREATE TYPE "public"."favoris_cible_type_enum" AS ENUM('mission', 'service', 'etudiant')`,
    );
    await queryRunner.query(
      `CREATE TABLE "favoris" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "utilisateur_id" uuid NOT NULL, "cible_type" "public"."favoris_cible_type_enum" NOT NULL, "cible_id" uuid NOT NULL, "date_ajout" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_favori_utilisateur_cible" UNIQUE ("utilisateur_id", "cible_type", "cible_id"), CONSTRAINT "PK_favoris_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "favoris" ADD CONSTRAINT "FK_favoris_utilisateur" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Transactions (paiements)
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_methode_enum" AS ENUM('mvola', 'orange_money', 'airtel_money', 'virement')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_statut_enum" AS ENUM('en_attente', 'confirmee', 'liberee', 'annulee')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "candidature_id" uuid NOT NULL, "client_id" uuid NOT NULL, "etudiant_id" uuid NOT NULL, "montant" numeric(10,2) NOT NULL, "methode" "public"."transactions_methode_enum" NOT NULL, "reference" character varying(100) NOT NULL, "statut" "public"."transactions_statut_enum" NOT NULL DEFAULT 'en_attente', "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date_confirmation" TIMESTAMP WITH TIME ZONE, "date_liberation" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_candidature" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_client" FOREIGN KEY ("client_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_etudiant" FOREIGN KEY ("etudiant_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_etudiant"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_client"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_candidature"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_statut_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_methode_enum"`);

    await queryRunner.query(`ALTER TABLE "favoris" DROP CONSTRAINT "FK_favoris_utilisateur"`);
    await queryRunner.query(`DROP TABLE "favoris"`);
    await queryRunner.query(`DROP TYPE "public"."favoris_cible_type_enum"`);

    await queryRunner.query(`ALTER TABLE "reactions_profil" DROP CONSTRAINT "FK_reactions_cible"`);
    await queryRunner.query(`ALTER TABLE "reactions_profil" DROP CONSTRAINT "FK_reactions_auteur"`);
    await queryRunner.query(`DROP TABLE "reactions_profil"`);

    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_destinataire"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_est_lue"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_destinataire"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);

    await queryRunner.query(`ALTER TABLE "utilisateurs" DROP COLUMN "reset_password_expire"`);
    await queryRunner.query(`ALTER TABLE "utilisateurs" DROP COLUMN "reset_password_token"`);
  }
}

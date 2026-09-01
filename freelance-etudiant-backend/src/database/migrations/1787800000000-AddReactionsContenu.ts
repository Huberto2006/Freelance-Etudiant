import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReactionsContenu1787800000000 implements MigrationInterface {
  name = "AddReactionsContenu1787800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cree le type enum cible partage uniquement s'il n'existe pas deja
    // (la migration Commentaires, appliquee avant celle-ci, l'a deja cree
    // sous le nom "commentaires_cible_type_enum" ; on cree ici un type
    // dedie pour rester independant du module commentaires).
    await queryRunner.query(
      `CREATE TYPE "public"."reactions_contenu_cible_type_enum" AS ENUM('mission', 'service')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reactions_contenu_type_enum" AS ENUM('jaime', 'jenaimepas')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reactions_contenu" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "auteur_id" uuid NOT NULL, "cible_type" "public"."reactions_contenu_cible_type_enum" NOT NULL, "cible_id" uuid NOT NULL, "type" "public"."reactions_contenu_type_enum" NOT NULL, "date_reaction" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_reaction_contenu_auteur_cible" UNIQUE ("auteur_id", "cible_type", "cible_id"), CONSTRAINT "PK_reactions_contenu_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reactions_contenu" ADD CONSTRAINT "FK_reactions_contenu_auteur" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reactions_contenu" DROP CONSTRAINT "FK_reactions_contenu_auteur"`,
    );
    await queryRunner.query(`DROP TABLE "reactions_contenu"`);
    await queryRunner.query(`DROP TYPE "public"."reactions_contenu_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reactions_contenu_cible_type_enum"`);
  }
}

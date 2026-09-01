import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommentaires1787700000000 implements MigrationInterface {
  name = "AddCommentaires1787700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."commentaires_cible_type_enum" AS ENUM('mission', 'service')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commentaires" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contenu" text NOT NULL, "auteur_id" uuid NOT NULL, "cible_type" "public"."commentaires_cible_type_enum" NOT NULL, "cible_id" uuid NOT NULL, "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date_modification" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_commentaires_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commentaires_cible_type" ON "commentaires" ("cible_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_commentaires_cible_id" ON "commentaires" ("cible_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "commentaires" ADD CONSTRAINT "FK_commentaires_auteur" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "commentaires" DROP CONSTRAINT "FK_commentaires_auteur"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commentaires_cible_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_commentaires_cible_type"`);
    await queryRunner.query(`DROP TABLE "commentaires"`);
    await queryRunner.query(`DROP TYPE "public"."commentaires_cible_type_enum"`);
  }
}

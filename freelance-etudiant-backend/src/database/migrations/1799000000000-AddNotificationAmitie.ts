import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationAmitie1799000000000
  implements MigrationInterface
{
  name = "AddNotificationAmitie1799000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."notifications_type_enum"
      ADD VALUE IF NOT EXISTS 'nouvelle_demande_amitie'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /*
     * PostgreSQL ne permet pas de supprimer directement une valeur
     * d'un ENUM. La valeur reste donc lors d'un rollback.
     *
     * Cette migration est volontairement irréversible côté ENUM.
     */
  }
}

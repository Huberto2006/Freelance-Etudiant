import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationInvitationGroupe1800000000000
  implements MigrationInterface
{
  name = "AddNotificationInvitationGroupe1800000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."notifications_type_enum"
      ADD VALUE IF NOT EXISTS 'nouvelle_invitation_groupe'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /*
     * PostgreSQL ne permet pas de supprimer directement une valeur
     * d'un ENUM. Cette migration est donc irréversible côté ENUM.
     */
  }
}
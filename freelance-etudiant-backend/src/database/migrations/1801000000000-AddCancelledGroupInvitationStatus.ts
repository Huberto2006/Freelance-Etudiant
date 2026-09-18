import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledGroupInvitationStatus1801000000000
  implements MigrationInterface
{
  name = 'AddCancelledGroupInvitationStatus1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."invitations_groupes_statut_enum" ADD VALUE IF NOT EXISTS 'annulee'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL ne permet pas de retirer directement une valeur d'un enum.
  }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Un paiement echoue / annule par le fournisseur declenchait une
 * notification de type `paiement_confirme` (affichee « Paiement confirme »,
 * en vert). Nouveau type dedie `paiement_echoue`.
 *
 * NOTE : PostgreSQL 12+ autorise ALTER TYPE ... ADD VALUE dans une
 * transaction tant que la valeur n'est pas utilisee dans la meme
 * transaction (cas present).
 */
export class AddNotificationPaiementEchoue1810000000000
  implements MigrationInterface
{
  name = 'AddNotificationPaiementEchoue1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'paiement_echoue'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL ne permet pas de retirer une valeur d'enum : sans effet.
  }
}

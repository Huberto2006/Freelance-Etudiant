import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Passerelle de paiement Papi (papi.mg).
 *
 * - ajoute la valeur 'papi' a l'enum des methodes de paiement ;
 * - ajoute "lien_paiement" : lien de paiement renvoye par la passerelle,
 *   conserve pour que le client puisse reprendre un paiement en attente.
 *
 * Purement additive : aucune donnee existante n'est modifiee, les
 * transactions MVola / virement restent valides.
 */
export class AddPapiPaiement1808000000000 implements MigrationInterface {
  name = 'AddPapiPaiement1808000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."transactions_methode_enum" ADD VALUE IF NOT EXISTS 'papi'`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "lien_paiement" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "lien_paiement"`,
    );
    // PostgreSQL ne permet pas de retirer une valeur d'enum : 'papi' reste
    // declare dans le type (sans effet tant qu'aucune ligne ne l'utilise).
  }
}

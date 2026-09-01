import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

/**
 * Paiement reel via fournisseur (MVola) :
 * - provider              : 'mvola' (paiement en ligne) ou 'manuel'
 *                           (declaration de virement hors plateforme,
 *                           verifiee par un administrateur)
 * - provider_correlation_id : identifiant serveur MVola
 *                           (serverCorrelationId) utilise pour la
 *                           verification du statut et l'idempotence
 * - telephone_debite      : numero du payeur (paiement mobile en ligne)
 * - provider_statut       : dernier statut brut renvoye par le fournisseur
 * Toutes les colonnes sont nulles pour rester retro-compatible avec les
 * transactions manuelles existantes.
 */
export class AddPaiementProviderColumns1790000000000
  implements MigrationInterface
{
  name = 'AddPaiementProviderColumns1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "provider" character varying(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "provider_correlation_id" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "telephone_debite" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "provider_statut" character varying(50)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_provider_correlation" ON "transactions" ("provider_correlation_id")`,
    );
    // Les transactions pre-existantes sont des declarations manuelles.
    await queryRunner.query(
      `UPDATE "transactions" SET "provider" = 'manuel' WHERE "provider" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_transactions_provider_correlation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "provider_statut"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "telephone_debite"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "provider_correlation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "provider"`,
    );
  }
}

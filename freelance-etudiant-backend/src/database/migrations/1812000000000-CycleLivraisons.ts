import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ajoute la date de soumission courante, le suivi de la correction unique,
 * la date de validation et l'historique non destructif des versions.
 */
export class CycleLivraisons1812000000000 implements MigrationInterface {
  name = 'CycleLivraisons1812000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "livraisons"
        ADD COLUMN IF NOT EXISTS "correction_utilisee" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "historique" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "date_derniere_soumission" timestamptz,
        ADD COLUMN IF NOT EXISTS "date_validation" timestamptz`,
    );
    await queryRunner.query(
      `UPDATE "livraisons"
       SET "date_derniere_soumission" = "date_livraison"
       WHERE "date_derniere_soumission" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "livraisons"
       SET "date_validation" = "date_maj"
       WHERE "statut" = 'validee' AND "date_validation" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "livraisons"
        ALTER COLUMN "date_derniere_soumission" SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN "date_derniere_soumission" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "livraisons"
        DROP COLUMN IF EXISTS "date_validation",
        DROP COLUMN IF EXISTS "date_derniere_soumission",
        DROP COLUMN IF EXISTS "historique",
        DROP COLUMN IF EXISTS "correction_utilisee"`,
    );
  }
}

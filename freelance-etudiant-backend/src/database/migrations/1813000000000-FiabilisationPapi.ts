import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fiabilisation des paiements Papi.
 *
 * - transactions : devise, operateur reel, jeton de notification Papi,
 *   expiration du lien et date de derniere mise a jour ;
 * - index unique partiel sur la reference des transactions Papi (cle
 *   d'idempotence Papi et de rapprochement des notifications) ;
 * - evenements_paiement : journal en ajout seul des notifications recues.
 *
 * Purement additive : aucune donnee existante n'est modifiee.
 */
export class FiabilisationPapi1813000000000 implements MigrationInterface {
  name = 'FiabilisationPapi1813000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions"
        ADD COLUMN IF NOT EXISTS "devise" character varying(3) NOT NULL DEFAULT 'MGA',
        ADD COLUMN IF NOT EXISTS "methode_fournisseur" character varying(30),
        ADD COLUMN IF NOT EXISTS "notification_token" character varying(100),
        ADD COLUMN IF NOT EXISTS "date_expiration_lien" timestamptz,
        ADD COLUMN IF NOT EXISTS "date_mise_a_jour" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_transaction_reference_papi"
        ON "transactions" ("reference") WHERE provider = 'papi'`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "evenements_paiement" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fournisseur" character varying(20) NOT NULL,
        "reference" character varying(100),
        "reference_fournisseur" character varying(100),
        "transaction_id" uuid,
        "statut_annonce" character varying(30),
        "montant_annonce" character varying(30),
        "resultat" character varying(60) NOT NULL,
        "code_http" integer NOT NULL,
        "recu_le" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_evenements_paiement" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_evenements_paiement_reference"
        ON "evenements_paiement" ("reference")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "evenements_paiement"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_transaction_reference_papi"`);
    await queryRunner.query(
      `ALTER TABLE "transactions"
        DROP COLUMN IF EXISTS "date_mise_a_jour",
        DROP COLUMN IF EXISTS "date_expiration_lien",
        DROP COLUMN IF EXISTS "notification_token",
        DROP COLUMN IF EXISTS "methode_fournisseur",
        DROP COLUMN IF EXISTS "devise"`,
    );
  }
}

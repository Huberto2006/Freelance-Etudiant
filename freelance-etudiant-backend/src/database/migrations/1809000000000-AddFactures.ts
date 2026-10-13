import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Facturation : table `factures` (une facture par transaction confirmee,
 * donnees copiees a l'emission) et `facture_compteurs` (numerotation
 * annuelle sans trou). Purement additive.
 */
export class AddFactures1809000000000 implements MigrationInterface {
  name = 'AddFactures1809000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "facture_compteurs" (
        "annee" integer NOT NULL,
        "dernier" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_facture_compteurs_annee" PRIMARY KEY ("annee")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "factures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "numero" character varying(30) NOT NULL,
        "transaction_id" uuid NOT NULL,
        "client_id" uuid NOT NULL,
        "etudiant_id" uuid NOT NULL,
        "montant" numeric(12,2) NOT NULL,
        "devise" character varying(5) NOT NULL DEFAULT 'Ar',
        "methode" character varying(30) NOT NULL,
        "reference_paiement" character varying(100) NOT NULL,
        "titre_mission" character varying(255) NOT NULL,
        "client_nom" character varying(150) NOT NULL,
        "client_entreprise" character varying(150),
        "client_email" character varying(150) NOT NULL,
        "etudiant_nom" character varying(150) NOT NULL,
        "emetteur_nom" character varying(150) NOT NULL,
        "emetteur_mention" text,
        "date_paiement" TIMESTAMP WITH TIME ZONE NOT NULL,
        "date_emission" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_factures_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_factures_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_factures_client" FOREIGN KEY ("client_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_factures_etudiant" FOREIGN KEY ("etudiant_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_facture_numero" ON "factures" ("numero")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_facture_transaction" ON "factures" ("transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_factures_client" ON "factures" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_factures_etudiant" ON "factures" ("etudiant_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "factures"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "facture_compteurs"`);
  }
}

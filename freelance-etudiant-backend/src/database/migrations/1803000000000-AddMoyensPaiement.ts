import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RG-PAY — Moyens de paiement des etudiants.
 *
 * - Table "moyens_paiement" : coordonnees Mobile Money (MVola, Orange
 *   Money, Airtel Money) ou compte bancaire, separees du profil etudiant.
 *   FK "etudiant_id" -> utilisateurs(id) en RESTRICT : la piece comptable
 *   reference un compte reel, jamais une ligne orpheline.
 * - Index unique PARTIEL "uq_moyen_paiement_principal" : un seul moyen
 *   principal par etudiant (RG-PAY-003), meme mecanisme que l'unicite
 *   des transactions actives par candidature.
 * - Snapshot sur "transactions" : les coordonnees utilisees au moment du
 *   paiement sont copiees dans des colonnes propres ; modifier ou
 *   supprimer un moyen n'altere JAMAIS l'historique d'un paiement.
 *   Toutes les colonnes sont nulles pour rester retro-compatible avec
 *   les transactions pre-existantes.
 */
export class AddMoyensPaiement1803000000000 implements MigrationInterface {
  name = 'AddMoyensPaiement1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."moyens_paiement_type_enum" AS ENUM('MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'BANQUE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "moyens_paiement" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "etudiant_id" uuid NOT NULL,
        "type" "public"."moyens_paiement_type_enum" NOT NULL,
        "operateur" character varying(50),
        "nom_banque" character varying(100),
        "numero" character varying(50) NOT NULL,
        "nom_titulaire" character varying(150) NOT NULL,
        "principal" boolean NOT NULL DEFAULT false,
        "actif" boolean NOT NULL DEFAULT true,
        "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_moyens_paiement_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_moyens_paiement_etudiant" FOREIGN KEY ("etudiant_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_moyens_paiement_etudiant" ON "moyens_paiement" ("etudiant_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_moyen_paiement_principal" ON "moyens_paiement" ("etudiant_id") WHERE principal = true`,
    );

    // Snapshot des coordonnees utilisees au moment du paiement.
    await queryRunner.query(
      `ALTER TABLE "transactions"
        ADD "moyen_paiement_id" uuid,
        ADD "type_moyen_paiement" "public"."moyens_paiement_type_enum",
        ADD "operateur_paiement" character varying(50),
        ADD "nom_banque_paiement" character varying(100),
        ADD "numero_paiement" character varying(50),
        ADD "nom_titulaire_paiement" character varying(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_moyen_paiement" FOREIGN KEY ("moyen_paiement_id") REFERENCES "moyens_paiement"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_moyen_paiement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions"
        DROP COLUMN "nom_titulaire_paiement",
        DROP COLUMN "numero_paiement",
        DROP COLUMN "nom_banque_paiement",
        DROP COLUMN "operateur_paiement",
        DROP COLUMN "type_moyen_paiement",
        DROP COLUMN "moyen_paiement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_moyen_paiement_principal"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_moyens_paiement_etudiant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "moyens_paiement"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."moyens_paiement_type_enum"`,
    );
  }
}

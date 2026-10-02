import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RG-PAY-012 — Moyens de paiement des CLIENTS (symetrique a
 * "moyens_paiement" cote etudiant, migration 1803000000000).
 *
 * Permet a un client d'enregistrer et de reutiliser un ou plusieurs
 * numeros Mobile Money depuis lesquels il paie (le champ
 * "telephoneDebite" de CreerPaiementDto n'etait jusqu'ici jamais
 * persiste : le client devait le retaper a chaque paiement).
 *
 * Limite volontairement a Mobile Money (pas de type "banque") : seul un
 * numero Mobile Money peut etre debite automatiquement via l'API MVola
 * (RG-PAY : aucun fournisseur ne permet un prelevement bancaire direct
 * en libre-service a Madagascar aujourd'hui). Reutilise le meme type
 * enum "moyens_paiement_type_enum" que la table etudiant, pour rester
 * coherent si Orange Money / Airtel Money deviennent disponibles cote
 * client aussi.
 *
 * Meme garantie d'unicite qu'etudiant (RG-PAY-003) : un seul moyen
 * principal par client, via index unique partiel.
 */
export class AddMoyensPaiementClient1807000000000
  implements MigrationInterface
{
  name = 'AddMoyensPaiementClient1807000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "moyens_paiement_client" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL,
        "type" "public"."moyens_paiement_type_enum" NOT NULL,
        "operateur" character varying(50),
        "numero" character varying(50) NOT NULL,
        "nom_titulaire" character varying(150) NOT NULL,
        "principal" boolean NOT NULL DEFAULT false,
        "actif" boolean NOT NULL DEFAULT true,
        "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_moyens_paiement_client_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_moyens_paiement_client_client" FOREIGN KEY ("client_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_moyens_paiement_client_client" ON "moyens_paiement_client" ("client_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_moyen_paiement_client_principal" ON "moyens_paiement_client" ("client_id") WHERE principal = true`,
    );

    // Snapshot sur la transaction : trace quel moyen CLIENT a servi a
    // payer, sans jamais dependre d'une ligne qui pourrait etre
    // modifiee/supprimee plus tard (meme philosophie que
    // moyen_paiement_id pour le beneficiaire).
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "moyen_paiement_client_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_moyen_paiement_client" FOREIGN KEY ("moyen_paiement_client_id") REFERENCES "moyens_paiement_client"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_moyen_paiement_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "moyen_paiement_client_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_moyen_paiement_client_principal"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_moyens_paiement_client_client"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "moyens_paiement_client"`);
  }
}

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * RG7/RGp2 : une evaluation ou une transaction ne doit jamais disparaitre
 * par cascade lors de la suppression d'un compte utilisateur (ou de la
 * candidature/livraison associee). On remplace les contraintes CASCADE par
 * des contraintes RESTRICT : Postgres bloquera alors toute suppression en
 * amont (Utilisateur, Candidature, Livraison) tant qu'une evaluation ou
 * une transaction en depend, forcant une decision explicite (suspension
 * de compte plutot que suppression definitive) au lieu d'une perte de
 * donnees silencieuse.
 */
export class RestrictCascadeEvaluationsTransactions1787500000000
  implements MigrationInterface
{
  name = "RestrictCascadeEvaluationsTransactions1787500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- evaluations ---
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_37dd704eeebd39c50d9cf7e60ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_37dd704eeebd39c50d9cf7e60ba" FOREIGN KEY ("livraison_id") REFERENCES "livraisons"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_e586f31665185492fa0f2275418"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_e586f31665185492fa0f2275418" FOREIGN KEY ("evaluateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_8bd60bdea9f0e78cc43801a2cef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_8bd60bdea9f0e78cc43801a2cef" FOREIGN KEY ("evalue_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // --- transactions ---
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_candidature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_candidature" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_client" FOREIGN KEY ("client_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_etudiant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_etudiant" FOREIGN KEY ("etudiant_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_etudiant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_etudiant" FOREIGN KEY ("etudiant_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_client"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_client" FOREIGN KEY ("client_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_candidature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_candidature" FOREIGN KEY ("candidature_id") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_8bd60bdea9f0e78cc43801a2cef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_8bd60bdea9f0e78cc43801a2cef" FOREIGN KEY ("evalue_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_e586f31665185492fa0f2275418"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_e586f31665185492fa0f2275418" FOREIGN KEY ("evaluateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_37dd704eeebd39c50d9cf7e60ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_37dd704eeebd39c50d9cf7e60ba" FOREIGN KEY ("livraison_id") REFERENCES "livraisons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}

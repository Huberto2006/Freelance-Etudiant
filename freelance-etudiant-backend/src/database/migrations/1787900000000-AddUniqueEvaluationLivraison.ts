import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * RG5/RG7 : une livraison ne peut recevoir qu'une seule evaluation.
 * Cette regle etait deja appliquee au niveau applicatif (verification
 * puis ConflictException dans EvaluationsService), mais rien n'empechait
 * une condition de course entre deux requetes simultanees. On ajoute donc
 * une contrainte UNIQUE en base, filet de securite definitif.
 */
export class AddUniqueEvaluationLivraison1787900000000 implements MigrationInterface {
  name = "AddUniqueEvaluationLivraison1787900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "uq_evaluations_livraison_id" UNIQUE ("livraison_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "uq_evaluations_livraison_id"`,
    );
  }
}

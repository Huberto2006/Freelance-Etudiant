import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RG-066 — Évaluation bidirectionnelle.
 *
 * Jusqu'ici la contrainte UNIQUE(livraison_id) limitait une livraison à
 * UNE seule évaluation (client -> étudiant, RG-037). Pour permettre le
 * parcours inverse (étudiant -> client) sans dupliquer la table, la
 * contrainte devient UNIQUE(livraison_id, evaluateur_id) :
 *   - une livraison peut porter au maximum deux évaluations
 *     (une par partie) ;
 *   - chaque auteur ne peut toujours évaluer qu'une seule fois
 *     (anti-doublon conservé, RG-037 par direction).
 */
export class EvaluationBidirectionnelle1802000000000
  implements MigrationInterface
{
  name = 'EvaluationBidirectionnelle1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT IF EXISTS "uq_evaluations_livraison_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "uq_evaluations_livraison_evaluateur_id" UNIQUE ("livraison_id", "evaluateur_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT IF EXISTS "uq_evaluations_livraison_evaluateur_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "uq_evaluations_livraison_id" UNIQUE ("livraison_id")`,
    );
  }
}

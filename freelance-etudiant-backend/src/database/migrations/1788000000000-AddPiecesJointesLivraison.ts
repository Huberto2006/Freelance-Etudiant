import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Module Livraisons : livraisons par methodes GitHub / GitLab / Fichiers.
 * - pieces_jointes : metadonnees des fichiers livres (URL relative renvoyee
 *   par POST /uploads/document + nom original + taille), stockees en jsonb.
 * - lien_livrable : elargi a 500 caracteres (deja le cas dans l'entite) pour
 *   accueillir les URL de depots GitHub/GitLab sans troncature.
 */
export class AddPiecesJointesLivraison1788000000000 implements MigrationInterface {
  name = "AddPiecesJointesLivraison1788000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "livraisons" ADD "pieces_jointes" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "livraisons" ALTER COLUMN "lien_livrable" TYPE character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "livraisons" ALTER COLUMN "lien_livrable" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "livraisons" DROP COLUMN "pieces_jointes"`,
    );
  }
}
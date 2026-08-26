import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPiecesJointes1787400000000 implements MigrationInterface {
  name = "AddPiecesJointes1787400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "piece_jointe_url" character varying(300)`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "piece_jointe_nom" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "demandes_service" ADD "piece_jointe_url" character varying(300)`,
    );
    await queryRunner.query(
      `ALTER TABLE "demandes_service" ADD "piece_jointe_nom" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "demandes_service" DROP COLUMN "piece_jointe_nom"`);
    await queryRunner.query(`ALTER TABLE "demandes_service" DROP COLUMN "piece_jointe_url"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "piece_jointe_nom"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "piece_jointe_url"`);
  }
}

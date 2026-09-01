import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageUrlToMission1787600000000 implements MigrationInterface {
  name = "AddImageUrlToMission1787600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "missions" ADD "image_url" character varying(300)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "missions" DROP COLUMN "image_url"`);
  }
}

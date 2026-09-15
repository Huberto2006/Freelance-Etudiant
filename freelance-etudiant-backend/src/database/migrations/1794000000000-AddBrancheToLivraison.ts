import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrancheToLivraison1794000000000 implements MigrationInterface {
  name = 'AddBrancheToLivraison1794000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "livraisons" ADD "branche" character varying(255)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "livraisons" DROP COLUMN "branche"`,
    );
  }
}
import { MigrationInterface, QueryRunner } from "typeorm";

export class MovePhotoUrlToUtilisateur1787141660111 implements MigrationInterface {
    name = 'MovePhotoUrlToUtilisateur1787141660111'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profils_etudiants" DROP COLUMN "photo_url"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profils_etudiants" ADD "photo_url" text`);
    }

}

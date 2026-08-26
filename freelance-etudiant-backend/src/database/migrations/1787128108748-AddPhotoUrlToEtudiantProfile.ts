import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhotoUrlToEtudiantProfile1787128108748 implements MigrationInterface {
    name = 'AddPhotoUrlToEtudiantProfile1787128108748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profils_etudiants" ADD "photo_url" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profils_etudiants" DROP COLUMN "photo_url"`);
    }

}

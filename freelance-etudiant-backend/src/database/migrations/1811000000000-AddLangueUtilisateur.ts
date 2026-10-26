import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Systeme multilingue (fr / mg / en) : langue d'interface preferee de chaque
 * utilisateur, utilisee pour les emails, notifications et messages d'erreur.
 * Les comptes existants prennent 'fr' (langue par defaut). Purement additive.
 */
export class AddLangueUtilisateur1811000000000 implements MigrationInterface {
  name = 'AddLangueUtilisateur1811000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ADD COLUMN IF NOT EXISTS "langue" character varying(5) NOT NULL DEFAULT 'fr'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" DROP COLUMN IF EXISTS "langue"`,
    );
  }
}

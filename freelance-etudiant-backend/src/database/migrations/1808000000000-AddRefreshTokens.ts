import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sessions revocables : table des refresh tokens (rotation + detection de
 * reutilisation). Seule l'empreinte SHA-256 du jeton est conservee.
 */
export class AddRefreshTokens1808000000000 implements MigrationInterface {
  name = 'AddRefreshTokens1808000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "utilisateur_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "date_expiration" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoque_le" TIMESTAMP WITH TIME ZONE,
        "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_utilisateur" FOREIGN KEY ("utilisateur_id")
          REFERENCES "utilisateurs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_utilisateur" ON "refresh_tokens" ("utilisateur_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_utilisateur"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}

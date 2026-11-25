import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1814000000000-AddUserSessions :
 * - Table user_sessions pour le suivi et le controle des sessions actives.
 * - Ajout du type de notification 'nouvelle_connexion' pour alerter en cas
 *   de premiere connexion depuis un nouvel appareil.
 */
export class AddUserSessions1814000000000 implements MigrationInterface {
  name = 'AddUserSessions1814000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Notification pour nouvelle connexion
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'nouvelle_connexion'`,
    );

    // 2. Table user_sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "utilisateur_id" uuid NOT NULL,
        "refresh_token_hash" character varying(64) NOT NULL,
        "type_appareil" character varying(30) NOT NULL DEFAULT 'inconnu',
        "navigateur" character varying(100) NOT NULL DEFAULT 'Inconnu',
        "systeme_exploitation" character varying(100) NOT NULL DEFAULT 'Inconnu',
        "adresse_ip" character varying(64) NOT NULL DEFAULT 'Inconnue',
        "user_agent" text,
        "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "derniere_activite" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "date_expiration" TIMESTAMP WITH TIME ZONE NOT NULL,
        "date_revocation" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_user_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_sessions_utilisateur" FOREIGN KEY ("utilisateur_id")
          REFERENCES "utilisateurs"("id") ON DELETE CASCADE
      )
    `);

    // 3. Index de performance pour les consultations et validations
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_sessions_utilisateur" ON "user_sessions" ("utilisateur_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_sessions_utilisateur_actif" ON "user_sessions" ("utilisateur_id", "date_revocation", "date_expiration")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_sessions_token_hash" ON "user_sessions" ("refresh_token_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_sessions_token_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_sessions_utilisateur_actif"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_sessions_utilisateur"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions"`);
  }
}

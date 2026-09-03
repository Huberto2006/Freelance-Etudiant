import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

/**
 * Verification de l'adresse email a l'inscription :
 * - email_verifie                 : vrai une fois l'adresse confirmee via le
 *                                   lien recu ; la connexion est bloquee sinon.
 * - email_verification_token_hash : empreinte SHA-256 du jeton a usage unique
 *                                   (le jeton en clair n'est JAMAIS stocke).
 * - email_verification_expire     : expiration du jeton de verification.
 * Retro-compatibilite : les comptes pre-existants (crees avant cette
 * fonctionnalite) sont marques verifies afin de ne pas les bloquer.
 */
export class AddEmailVerification1791000000000
  implements MigrationInterface
{
  name = 'AddEmailVerification1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ADD "email_verifie" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ADD "email_verification_token_hash" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" ADD "email_verification_expire" timestamptz`,
    );
    // Les comptes existants ne doivent pas etre bloques par la nouvelle
    // regle de connexion (ils n'ont jamais recu d'email de verification).
    await queryRunner.query(
      `UPDATE "utilisateurs" SET "email_verifie" = true`,
    );
    // Recherche du compte a partir du jeton fourni dans le lien email.
    await queryRunner.query(
      `CREATE INDEX "IDX_utilisateurs_email_verification_token" ON "utilisateurs" ("email_verification_token_hash")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_utilisateurs_email_verification_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" DROP COLUMN "email_verification_expire"`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" DROP COLUMN "email_verification_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "utilisateurs" DROP COLUMN "email_verifie"`,
    );
  }
}
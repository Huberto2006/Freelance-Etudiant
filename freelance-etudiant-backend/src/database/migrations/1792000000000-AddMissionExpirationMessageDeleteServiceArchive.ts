import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Améliorations fonctionnelles :
 *
 * 1. Expiration des missions :
 *    - nouvelle valeur 'expiree' dans missions_statut_enum ;
 *    - nouveau type de notification 'mission_expiree' dans
 *      notifications_type_enum (notification envoyée au client
 *      propriétaire, une seule fois par mission).
 *
 * 2. Suppression logique des messages (tombstone) : le contenu reste en
 *    base pour conserver l'ordre/l'historique de la conversation, mais est
 *    masqué à l'affichage ; seul l'expéditeur d'un message peut le
 *    supprimer (supprime_par_id conserve qui a supprimé).
 *
 * 3. Archivage des services (suppression logique) : un service archivé
 *    n'apparaît plus dans le catalogue et n'accepte plus de commande,
 *    tout en préservant l'historique des demandes de service liées
 *    (demandes_service.service_id est en CASCADE : une suppression
 *    physique casserait cet historique).
 */
export class AddMissionExpirationMessageDeleteServiceArchive1792000000000
  implements MigrationInterface
{
  name = 'AddMissionExpirationMessageDeleteServiceArchive1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOTE : PostgreSQL 12+ autorise ALTER TYPE ... ADD VALUE dans une
    // transaction tant que la nouvelle valeur n'est pas utilisee dans la
    // meme transaction (ce qui est le cas ici).
    await queryRunner.query(
      `ALTER TYPE "public"."missions_statut_enum" ADD VALUE IF NOT EXISTS 'expiree' AFTER 'fermee'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'mission_expiree' AFTER 'nouvelle_reaction'`,
    );

    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN "est_supprime" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN "supprime_par_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_est_supprime" ON "messages" ("est_supprime")`,
    );

    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN "est_archive" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_services_est_archive" ON "services" ("est_archive")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Les valeurs d'enum ajoutees ne peuvent pas etre retirees en
    // PostgreSQL sans recreer le type : down() ne supprime que les
    // colonnes/index ajoutes. Les lignes utilisant 'expiree' ou
    // 'mission_expiree' doivent etre requalifiees manuellement avant
    // toute restauration complete.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_services_est_archive"`);
    await queryRunner.query(
      `ALTER TABLE "services" DROP COLUMN IF EXISTS "est_archive"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_messages_est_supprime"`);
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "supprime_par_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "est_supprime"`,
    );
  }
}

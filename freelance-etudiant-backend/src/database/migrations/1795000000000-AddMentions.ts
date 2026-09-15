import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fonctionnalite @mention dans les commentaires :
 *
 * 1. Nouvelle table "mentions" : associe un commentaire a un utilisateur
 *    identifie via @ dans son texte.
 *    - contrainte unique (commentaire_id, utilisateur_id) : jamais de
 *      doublon si le meme utilisateur est mentionne plusieurs fois ;
 *    - suppressions en CASCADE : la suppression d'un commentaire efface
 *      ses mentions, la suppression d'un utilisateur effage les siennes.
 *
 * 2. Nouvelle valeur 'mention' dans notifications_type_enum pour le
 *    systeme de notifications existant (cf. TypeNotification.MENTION).
 */
export class AddMentions1795000000000 implements MigrationInterface {
  name = 'AddMentions1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mentions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "commentaire_id" uuid NOT NULL, "utilisateur_id" uuid NOT NULL, "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_mention_commentaire_utilisateur" UNIQUE ("commentaire_id", "utilisateur_id"), CONSTRAINT "PK_mentions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mentions_utilisateur_id" ON "mentions" ("utilisateur_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" ADD CONSTRAINT "FK_mentions_commentaire" FOREIGN KEY ("commentaire_id") REFERENCES "commentaires"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" ADD CONSTRAINT "FK_mentions_utilisateur" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // NOTE : PostgreSQL 12+ autorise ALTER TYPE ... ADD VALUE dans une
    // transaction tant que la nouvelle valeur n'est pas utilisee dans la
    // meme transaction (ce qui est le cas ici).
    //
    // Reparation au passage : 'nouveau_commentaire' (type utilise par le
    // systeme de notifications existant pour les commentaires) n'avait
    // jamais ete ajoute a l'enum PostgreSQL par aucune migration (l'insert
    // de ces notifications echouait donc silencieusement en base). On
    // l'ajoute de facon idempotente, avec une reference AFTER toujours
    // existante ('nouvelle_evaluation' fait partie de l'enum initial).
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'nouveau_commentaire' AFTER 'nouvelle_evaluation'`,
    );
    // Nouvelle valeur pour les mentions (append en fin d'enum : l'ordre
    // des labels est purement decoratif, on ne reference aucun label
    // dans AFTER pour rester robuste sur toutes les bases).
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'mention'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Les valeurs d'enum ajoutees ne peuvent pas etre retirees en
    // PostgreSQL sans recreer le type : down() ne supprime que la table.
    // Les lignes de notifications utilisant 'mention' ou
    // 'nouveau_commentaire' doivent etre requalifiees manuellement avant
    // toute restauration complete.
    await queryRunner.query(
      `ALTER TABLE "mentions" DROP CONSTRAINT IF EXISTS "FK_mentions_utilisateur"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mentions" DROP CONSTRAINT IF EXISTS "FK_mentions_commentaire"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mentions_utilisateur_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mentions"`);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

/**
 * Amitiés entre étudiants :
 * 1. TABLE amities : demandeur/receveur -> profils_etudiants (FK CASCADE),
 *    statut (enum PostgreSQL amities_statut_enum, cree par createTable),
 *    date_creation (timestamptz), date_reponse (timestamptz nullable) ;
 * 2. index unique PARTIEL sur la paire normalisee (LEAST/GREATEST) restreint
 *    aux statuts actifs (en_attente, acceptee) : impossible d'avoir deux
 *    relations actives entre les memes etudiants (A->B et B->A en meme
 *    temps), tout en autorisant une nouvelle demande apres un refus (une
 *    ligne refusee n'entre pas dans l'index) ;
 * 3. index simples sur demandeur_id et receveur_id (recherches directionnelles).
 */
export class AddAmitie1798000000000 implements MigrationInterface {
  name = 'AddAmitie1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExiste = await queryRunner.hasTable('amities');

    if (!tableExiste) {
      /**
       * =========================
       * TABLE : amities
       * (le type PostgreSQL amities_statut_enum est cree par createTable)
       * =========================
       */
      await queryRunner.createTable(
        new Table({
          name: 'amities',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'demandeur_id',
              type: 'uuid',
            },
            {
              name: 'receveur_id',
              type: 'uuid',
            },
            {
              name: 'statut',
              type: 'enum',
              enum: ['en_attente', 'acceptee', 'refusee'],
              default: "'en_attente'",
            },
            {
              name: 'date_creation',
              type: 'timestamptz',
              default: 'now()',
            },
            {
              name: 'date_reponse',
              type: 'timestamptz',
              isNullable: true,
            },
          ],
        }),
        true,
      );

      /**
       * Amitié → Étudiant demandeur
       */
      await queryRunner.createForeignKey(
        'amities',
        new TableForeignKey({
          name: 'fk_amities_demandeur',
          columnNames: ['demandeur_id'],
          referencedTableName: 'profils_etudiants',
          referencedColumnNames: ['utilisateur_id'],
          onDelete: 'CASCADE',
        }),
      );

      /**
       * Amitié → Étudiant receveur
       */
      await queryRunner.createForeignKey(
        'amities',
        new TableForeignKey({
          name: 'fk_amities_receveur',
          columnNames: ['receveur_id'],
          referencedTableName: 'profils_etudiants',
          referencedColumnNames: ['utilisateur_id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    /**
     * =========================
     * UNICITÉ DE LA PAIRE ACTIVE
     * =========================
     * La paire est normalisee : (A,B) et (B,A) produisent la meme cle.
     * L'index est PARTIEL (statuts actifs uniquement) : une demande
     * refusee ne bloque donc pas une nouvelle demande.
     */
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_amities_paire_active"
       ON "amities" (LEAST("demandeur_id", "receveur_id"), GREATEST("demandeur_id", "receveur_id"))
       WHERE "statut" IN ('en_attente', 'acceptee')`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_amities_demandeur" ON "amities" ("demandeur_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_amities_receveur" ON "amities" ("receveur_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * La suppression de la table emporte ses index et ses cles etrangeres.
     */
    await queryRunner.dropTable('amities', true);

    /**
     * Le type enum n'est pas supprime par dropTable : nettoyage explicite
     * pour un down() complet.
     */
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."amities_statut_enum"`,
    );
  }
}

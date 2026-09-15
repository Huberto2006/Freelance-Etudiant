import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

/**
 * Messagerie de groupe :
 * 1. messages.destinataire_id devient nullable (message de groupe sans
 *    destinataire unique) ;
 * 2. messages.groupe_id nullable + FK vers groupes ;
 * 3. table message_groupe_lectures (suivi de lecture par membre) avec
 *    unicite (message_id, utilisateur_id) et cascades.
 */
export class AddMessagerieGroupe1797000000000 implements MigrationInterface {
  name = 'AddMessagerieGroupe1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * =========================
     * 1. messages.destinataire_id : NOT NULL -> nullable
     * =========================
     */
    const messagesTable = await queryRunner.getTable('messages');

    const destinataireColumn =
      messagesTable?.findColumnByName('destinataire_id');

    if (destinataireColumn && !destinataireColumn.isNullable) {
      await queryRunner.changeColumn(
        'messages',
        destinataireColumn,
        new TableColumn({
          name: 'destinataire_id',
          type: 'uuid',
          isNullable: true,
        }),
      );
    }

    /**
     * =========================
     * 2. messages.groupe_id : colonne nullable + FK vers groupes
     * =========================
     */
    const groupeColumn = messagesTable?.findColumnByName('groupe_id');

    if (!groupeColumn) {
      await queryRunner.addColumn(
        'messages',
        new TableColumn({
          name: 'groupe_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      /**
       * Message -> Groupe : la suppression du groupe entraine celle de sa
       * conversation (et des lectures associees via le message).
       */
      await queryRunner.createForeignKey(
        'messages',
        new TableForeignKey({
          name: 'fk_messages_groupe',
          columnNames: ['groupe_id'],
          referencedTableName: 'groupes',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    /**
     * =========================
     * 3. TABLE : message_groupe_lectures
     * =========================
     */
    await queryRunner.createTable(
      new Table({
        name: 'message_groupe_lectures',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'message_id',
            type: 'uuid',
          },
          {
            name: 'utilisateur_id',
            type: 'uuid',
          },
          {
            name: 'date_lecture',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    /**
     * Lecture -> Message : suppression du message => suppression des
     * lectures associees.
     */
    await queryRunner.createForeignKey(
      'message_groupe_lectures',
      new TableForeignKey({
        name: 'fk_message_groupe_lectures_message',
        columnNames: ['message_id'],
        referencedTableName: 'messages',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    /**
     * Lecture -> Utilisateur : suppression de l'utilisateur => suppression
     * de ses lectures.
     */
    await queryRunner.createForeignKey(
      'message_groupe_lectures',
      new TableForeignKey({
        name: 'fk_message_groupe_lectures_utilisateur',
        columnNames: ['utilisateur_id'],
        referencedTableName: 'utilisateurs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    /**
     * Un meme utilisateur ne peut avoir qu'une seule lecture par message.
     */
    await queryRunner.createUniqueConstraint(
      'message_groupe_lectures',
      new TableUnique({
        name: 'uq_message_groupe_lecture',
        columnNames: ['message_id', 'utilisateur_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * 3. Suppression de la table de lecture (FKs supprimees avec elle).
     */
    await queryRunner.dropTable('message_groupe_lectures', true);

    const messagesTable = await queryRunner.getTable('messages');

    /**
     * 2. Suppression FK + colonne messages.groupe_id.
     */
    const groupeFk = messagesTable?.foreignKeys.find(
      (fk) => fk.name === 'fk_messages_groupe',
    );

    if (groupeFk) {
      await queryRunner.dropForeignKey('messages', groupeFk);
    }

    const groupeColumn = messagesTable?.findColumnByName('groupe_id');

    if (groupeColumn) {
      await queryRunner.dropColumn('messages', groupeColumn);
    }

    /**
     * 1. Restauration de NOT NULL sur messages.destinataire_id.
     *
     * Les messages de groupe (destinataire_id NULL) n'ont plus de sens
     * dans le modele anterieur : ils sont supprimes pour permettre la
     * restauration de la contrainte.
     */
    await queryRunner.query(
      `DELETE FROM "messages" WHERE "destinataire_id" IS NULL`,
    );

    const destinataireColumn =
      messagesTable?.findColumnByName('destinataire_id');

    if (destinataireColumn && destinataireColumn.isNullable) {
      await queryRunner.changeColumn(
        'messages',
        destinataireColumn,
        new TableColumn({
          name: 'destinataire_id',
          type: 'uuid',
          isNullable: false,
        }),
      );
    }
  }
}

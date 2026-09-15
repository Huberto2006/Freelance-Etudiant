import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class AddGroupes1796000000000 implements MigrationInterface {
  name = 'AddGroupes1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * =========================
     * TABLE : groupes
     * =========================
     */
    await queryRunner.createTable(
      new Table({
        name: 'groupes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'nom',
            type: 'varchar',
            length: '150',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createur_id',
            type: 'uuid',
          },
          {
            name: 'mission_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'date_creation',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    /**
     * Groupe → Étudiant créateur
     */
    await queryRunner.createForeignKey(
      'groupes',
      new TableForeignKey({
        name: 'fk_groupes_createur',
        columnNames: ['createur_id'],
        referencedTableName: 'profils_etudiants',
        referencedColumnNames: ['utilisateur_id'],
        onDelete: 'CASCADE',
      }),
    );

    /**
     * Groupe → Mission facultative
     */
    await queryRunner.createForeignKey(
      'groupes',
      new TableForeignKey({
        name: 'fk_groupes_mission',
        columnNames: ['mission_id'],
        referencedTableName: 'missions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    /**
     * =========================
     * TABLE : membres_groupes
     * =========================
     */
    await queryRunner.createTable(
      new Table({
        name: 'membres_groupes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'groupe_id',
            type: 'uuid',
          },
          {
            name: 'etudiant_id',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            default: "'membre'",
          },
          {
            name: 'date_adhesion',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'membres_groupes',
      new TableForeignKey({
        name: 'fk_membres_groupes_groupe',
        columnNames: ['groupe_id'],
        referencedTableName: 'groupes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'membres_groupes',
      new TableForeignKey({
        name: 'fk_membres_groupes_etudiant',
        columnNames: ['etudiant_id'],
        referencedTableName: 'profils_etudiants',
        referencedColumnNames: ['utilisateur_id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'membres_groupes',
      new TableUnique({
        name: 'uq_membre_groupe_etudiant',
        columnNames: ['groupe_id', 'etudiant_id'],
      }),
    );

    /**
     * =========================
     * TABLE : invitations_groupes
     * =========================
     */
    await queryRunner.createTable(
      new Table({
        name: 'invitations_groupes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'groupe_id',
            type: 'uuid',
          },
          {
            name: 'inviteur_id',
            type: 'uuid',
          },
          {
            name: 'invite_id',
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
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'invitations_groupes',
      new TableForeignKey({
        name: 'fk_invitations_groupes_groupe',
        columnNames: ['groupe_id'],
        referencedTableName: 'groupes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invitations_groupes',
      new TableForeignKey({
        name: 'fk_invitations_groupes_inviteur',
        columnNames: ['inviteur_id'],
        referencedTableName: 'profils_etudiants',
        referencedColumnNames: ['utilisateur_id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invitations_groupes',
      new TableForeignKey({
        name: 'fk_invitations_groupes_invite',
        columnNames: ['invite_id'],
        referencedTableName: 'profils_etudiants',
        referencedColumnNames: ['utilisateur_id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'invitations_groupes',
      new TableUnique({
        name: 'uq_invitation_groupe_invite',
        columnNames: ['groupe_id', 'invite_id'],
      }),
    );

    /**
     * =========================
     * CANDIDATURES → GROUPES
     * =========================
     */
    await queryRunner.addColumn(
      'candidatures',
      new TableColumn({
        name: 'groupe_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'candidatures',
      new TableForeignKey({
        name: 'fk_candidatures_groupe',
        columnNames: ['groupe_id'],
        referencedTableName: 'groupes',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * CANDIDATURES → GROUPES
     */
    const candidaturesTable =
      await queryRunner.getTable('candidatures');

    const candidatureGroupeFk =
      candidaturesTable?.foreignKeys.find(
        (fk) => fk.name === 'fk_candidatures_groupe',
      );

    if (candidatureGroupeFk) {
      await queryRunner.dropForeignKey(
        'candidatures',
        candidatureGroupeFk,
      );
    }

    const candidatureGroupeColumn =
      candidaturesTable?.findColumnByName('groupe_id');

    if (candidatureGroupeColumn) {
      await queryRunner.dropColumn(
        'candidatures',
        candidatureGroupeColumn,
      );
    }

    /**
     * INVITATIONS
     */
    await queryRunner.dropTable(
      'invitations_groupes',
      true,
    );

    /**
     * MEMBRES
     */
    await queryRunner.dropTable(
      'membres_groupes',
      true,
    );

    /**
     * GROUPES
     */
    await queryRunner.dropTable(
      'groupes',
      true,
    );
  }
}
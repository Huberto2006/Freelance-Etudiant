import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

/**
 * IDEMPOTENCE PAIEMENT (RGp1) : garantit qu'une meme candidature ne peut
 * avoir qu'UNE SEULE transaction non annulee (en_attente / confirmee /
 * liberee). Deux requetes de paiement envoyees simultanement (double-clic,
 * reseau instable, double webhook) ne peuvent donc plus creer deux
 * paiements actifs. Les transactions ANNULEES sont exclues de la
 * contrainte : apres annulation administrative, un nouveau paiement reste
 * possible (le client doit pouvoir redeclarer).
 *
 * Migration additive : aucune donnee existante n'est modifiee. Si la base
 * contenait deja des doublons actifs (etat illégal que l'application ne
 * peut plus produire), la creation de l'index echouerait : la requete
 * up() detecte ce cas et remonte une erreur explicite invitant a
 * annuler les doublons avant de rejouer la migration.
 */
export class AddUniqueActiveTransactionPerCandidature1793000000000
  implements MigrationInterface
{
  name = 'AddUniqueActiveTransactionPerCandidature1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const doublons = await queryRunner.query(
      `SELECT "candidature_id", COUNT(*)::int AS "total"
         FROM "transactions"
        WHERE "statut" != 'annulee'
        GROUP BY "candidature_id"
       HAVING COUNT(*) > 1`,
    );

    if (Array.isArray(doublons) && doublons.length > 0) {
      throw new Error(
        `Impossible de creer l'index d'unicite : ${doublons.length} candidature(s) possedent plusieurs paiements actifs. Annulez les paiements en double (statut 'annulee') via l'administration puis rejouez la migration.`,
      );
    }

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_transaction_active_par_candidature"
         ON "transactions" ("candidature_id")
        WHERE "statut" != 'annulee'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_transaction_active_par_candidature"`,
    );
  }
}
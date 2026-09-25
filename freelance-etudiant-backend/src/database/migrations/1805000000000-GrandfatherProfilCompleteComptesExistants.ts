import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grandfathering de "profil_complete" pour les comptes deja existants.
 *
 * Contexte : le questionnaire de completion de profil (etudiant, ecran
 * /completer-profil) ne doit s'afficher QUE pour les personnes qui
 * s'inscrivent APRES la mise en place de cette fonctionnalite — jamais
 * pour un compte deja actif sur la plateforme avant elle.
 *
 * La colonne "profil_complete" (migration 1804000000000) est ajoutee
 * avec DEFAULT false pour toutes les lignes, y compris les comptes
 * deja existants : sans backfill, ces comptes seraient renvoyes vers
 * le questionnaire des leur prochaine connexion, alors qu'ils n'ont
 * jamais eu a le remplir.
 *
 * up() marque donc "complet" tout compte deja present au moment de ce
 * deploiement (quel que soit son role), une seule fois. Toute
 * inscription posterieure a ce deploiement repart normalement de
 * profil_complete = false et suit le questionnaire jusqu'a completion
 * reelle (recalcul serveur, cf. ProfileCompletionService).
 */
export class GrandfatherProfilCompleteComptesExistants1805000000000
  implements MigrationInterface
{
  name = 'GrandfatherProfilCompleteComptesExistants1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "utilisateurs" SET "profil_complete" = true WHERE "profil_complete" = false`,
    );
  }

  public async down(): Promise<void> {
    // Backfill de donnees, non reversible de maniere significative :
    // on ne sait pas retrospectivement quels comptes etaient "vraiment"
    // grandfathered vs. deja completes naturellement. Aucune action.
  }
}

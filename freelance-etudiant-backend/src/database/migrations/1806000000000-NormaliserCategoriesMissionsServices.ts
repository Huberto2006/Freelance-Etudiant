import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Normalise les categories existantes des missions et des services.
 *
 * Le formulaire de service enregistrait "Développement" / "Rédaction" /
 * "Multimédia" (avec accents) alors que le referentiel, les liens de
 * l'accueil et le filtre backend utilisent "Developpement" / "Redaction"
 * (sans accents) : ces services n'apparaissaient jamais dans le filtre par
 * categorie. On aligne les donnees existantes sur les valeurs canoniques
 * (memes valeurs que common/utils/categorie.util.ts).
 */
const CATEGORIES_CANONIQUES = [
  "Developpement",
  "Design",
  "Redaction",
  "Traduction",
  "Marketing",
  "Video",
  "Data",
  "Administratif",
  "Multimedia",
  "Autre",
];

const CLE_SQL = `translate(lower(btrim("categorie")), 'éèêëàâäîïôöùûüç', 'eeeeaaaiioouuuc')`;

export class NormaliserCategoriesMissionsServices1806000000000
  implements MigrationInterface
{
  name = "NormaliserCategoriesMissionsServices1806000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["missions", "services"]) {
      for (const canonique of CATEGORIES_CANONIQUES) {
        await queryRunner.query(
          `UPDATE "${table}" SET "categorie" = $1 WHERE ${CLE_SQL} = $2 AND "categorie" <> $1`,
          [canonique, canonique.toLowerCase()],
        );
      }
      // Faute de frappe frequente.
      await queryRunner.query(
        `UPDATE "${table}" SET "categorie" = 'Developpement' WHERE ${CLE_SQL} = 'developement'`,
      );
    }
  }

  public async down(): Promise<void> {
    // Normalisation de donnees : non reversible (les valeurs d'origine ne
    // sont pas conservees).
  }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDemandesService1787300000000 implements MigrationInterface {
  name = "AddDemandesService1787300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."demandes_service_statut_enum" AS ENUM('en_attente', 'acceptee', 'refusee')`,
    );
    await queryRunner.query(
      `CREATE TABLE "demandes_service" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "client_id" uuid NOT NULL, "cahier_des_charges" text NOT NULL, "budget_propose" numeric(10,2) NOT NULL, "delai_souhaite" integer NOT NULL, "statut" "public"."demandes_service_statut_enum" NOT NULL DEFAULT 'en_attente', "mission_id" uuid, "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_demandes_service_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "demandes_service" ADD CONSTRAINT "FK_demandes_service_service" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "demandes_service" ADD CONSTRAINT "FK_demandes_service_client" FOREIGN KEY ("client_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "demandes_service" ADD CONSTRAINT "FK_demandes_service_mission" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "demandes_service" DROP CONSTRAINT "FK_demandes_service_mission"`);
    await queryRunner.query(`ALTER TABLE "demandes_service" DROP CONSTRAINT "FK_demandes_service_client"`);
    await queryRunner.query(`ALTER TABLE "demandes_service" DROP CONSTRAINT "FK_demandes_service_service"`);
    await queryRunner.query(`DROP TABLE "demandes_service"`);
    await queryRunner.query(`DROP TYPE "public"."demandes_service_statut_enum"`);
  }
}

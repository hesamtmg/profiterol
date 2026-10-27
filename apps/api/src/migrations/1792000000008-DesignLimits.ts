import { MigrationInterface, QueryRunner } from 'typeorm';

/** Who sent each design (hashed browser key and phone), to show visitors their own designs and limit how many they send. */
export class DesignLimits1792000000008 implements MigrationInterface {
  name = 'DesignLimits1792000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "design_requests" ADD "phoneKey" character varying(20) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "design_requests" ADD "visitorKey" character varying(64) NOT NULL DEFAULT ''`);
    await queryRunner.query(`CREATE INDEX "IDX_design_requests_visitor" ON "design_requests" ("siteId", "visitorKey")`);
    await queryRunner.query(`CREATE INDEX "IDX_design_requests_phone" ON "design_requests" ("siteId", "phoneKey")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_design_requests_phone"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_design_requests_visitor"`);
    await queryRunner.query(`ALTER TABLE "design_requests" DROP COLUMN "visitorKey"`);
    await queryRunner.query(`ALTER TABLE "design_requests" DROP COLUMN "phoneKey"`);
  }
}

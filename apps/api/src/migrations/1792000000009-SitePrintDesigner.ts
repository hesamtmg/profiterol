import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The sublimation designer is allowed only on the sites the owner picks. Sites that already have the designer on a
 * page keep it, so nothing that is live goes away.
 */
export class SitePrintDesigner1792000000009 implements MigrationInterface {
  name = 'SitePrintDesigner1792000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" ADD "printDesigner" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `UPDATE "sites" SET "printDesigner" = true WHERE "id" IN (
        SELECT "siteId" FROM "page_translations"
        WHERE "blocks"::text LIKE '%"textile-designer"%' OR "publishedBlocks"::text LIKE '%"textile-designer"%'
        UNION SELECT "siteId" FROM "design_requests")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "printDesigner"`);
  }
}

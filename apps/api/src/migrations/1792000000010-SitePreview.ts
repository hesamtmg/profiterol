import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preview sites: trials the owner makes for people thinking of buying a site, served at
 * <PREVIEW_URL>/preview/<previewSlug> until `expiresAt` (see Site.preview).
 */
export class SitePreview1792000000010 implements MigrationInterface {
  name = 'SitePreview1792000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" ADD "preview" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "sites" ADD "previewSlug" character varying(40)`);
    await queryRunner.query(`ALTER TABLE "sites" ADD "expiresAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "sites" ADD "prospect" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_171b5bdb5cf505e8c1d3743b6e" ON "sites" ("previewSlug") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_171b5bdb5cf505e8c1d3743b6e"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "prospect"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "expiresAt"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "previewSlug"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "preview"`);
  }
}

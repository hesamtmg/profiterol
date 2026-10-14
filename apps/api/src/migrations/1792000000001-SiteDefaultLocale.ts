import { MigrationInterface, QueryRunner } from 'typeorm';

/** The language visitors land on, chosen in each site's settings. Existing sites keep following the browser. */
export class SiteDefaultLocale1792000000001 implements MigrationInterface {
  name = 'SiteDefaultLocale1792000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "defaultLocale" character varying(8) NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "defaultLocale"`);
  }
}

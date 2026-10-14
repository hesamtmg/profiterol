import { MigrationInterface, QueryRunner } from 'typeorm';

/** The language each site's admin panel opens in, chosen by the owner. Existing sites keep following the browser. */
export class SiteAdminLang1792000000000 implements MigrationInterface {
  name = 'SiteAdminLang1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" ADD "adminLang" character varying(8) NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "adminLang"`);
  }
}

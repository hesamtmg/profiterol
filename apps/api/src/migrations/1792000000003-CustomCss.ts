import { MigrationInterface, QueryRunner } from 'typeorm';

/** Custom CSS for the whole site, and for each page (a draft, and the copy visitors see once published). */
export class CustomCss1792000000003 implements MigrationInterface {
  name = 'CustomCss1792000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "customCss" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "pages" ADD "customCss" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "pages" ADD "publishedCss" text NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "publishedCss"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "customCss"`);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "customCss"`);
  }
}

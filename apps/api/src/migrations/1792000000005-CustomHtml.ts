import { MigrationInterface, QueryRunner } from 'typeorm';

/** HTML tags the site's owner adds to every page: at the end of <head>, and at the end of <body>. */
export class CustomHtml1792000000005 implements MigrationInterface {
  name = 'CustomHtml1792000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "headHtml" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "bodyHtml" text NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "bodyHtml"`);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "headHtml"`);
  }
}

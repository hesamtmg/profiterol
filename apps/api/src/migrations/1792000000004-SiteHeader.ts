import { MigrationInterface, QueryRunner } from 'typeorm';

/** The header's button and placement, set beside the menu in Site settings. */
export class SiteHeader1792000000004 implements MigrationInterface {
  name = 'SiteHeader1792000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "header" jsonb NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "header"`);
  }
}

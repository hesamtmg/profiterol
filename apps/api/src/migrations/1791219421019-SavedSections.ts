import { MigrationInterface, QueryRunner } from 'typeorm';

export class SavedSections1791219421019 implements MigrationInterface {
  name = 'SavedSections1791219421019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "sections" jsonb NOT NULL DEFAULT '[]'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "sections"`);
  }
}

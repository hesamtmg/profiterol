import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessInfo1791240000000 implements MigrationInterface {
  name = 'BusinessInfo1791240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "business" jsonb NOT NULL DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "business"`);
  }
}

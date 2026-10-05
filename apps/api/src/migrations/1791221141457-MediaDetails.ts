import { MigrationInterface, QueryRunner } from 'typeorm';

export class MediaDetails1791221141457 implements MigrationInterface {
  name = 'MediaDetails1791221141457';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "media" ADD "placeholder" text`);
    await queryRunner.query(`ALTER TABLE "media" ADD "alt" jsonb NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "media" ADD "folder" character varying NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "folder"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "alt"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "placeholder"`);
  }
}

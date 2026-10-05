import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFontsThemesLoader1791190322922 implements MigrationInterface {
    name = 'AddFontsThemesLoader1791190322922'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "site_settings" ADD "fonts" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "site_settings" ADD "savedThemes" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "site_settings" ADD "loader" jsonb NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "loader"`);
        await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "savedThemes"`);
        await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "fonts"`);
    }

}

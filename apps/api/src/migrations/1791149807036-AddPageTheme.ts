import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPageTheme1791149807036 implements MigrationInterface {
    name = 'AddPageTheme1791149807036'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pages" ADD "theme" jsonb`);
        await queryRunner.query(`ALTER TABLE "pages" ADD "publishedTheme" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "publishedTheme"`);
        await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "theme"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMediaSize1791192507768 implements MigrationInterface {
    name = 'AddMediaSize1791192507768'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "media" ADD "width" integer`);
        await queryRunner.query(`ALTER TABLE "media" ADD "height" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "height"`);
        await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "width"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddForms1791146039176 implements MigrationInterface {
    name = 'AddForms1791146039176'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "form_submissions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "pageId" uuid, "pageTitle" character varying NOT NULL DEFAULT '', "blockId" character varying(40) NOT NULL, "formTitle" character varying NOT NULL DEFAULT '', "locale" character varying(8) NOT NULL, "data" jsonb NOT NULL DEFAULT '[]', "read" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fb6e1e9f26cda31c358a8a1530e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5b63d257b93d231b61e181a8d6" ON "form_submissions" ("read", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "site_settings" ADD "notifyEmail" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "notifyEmail"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5b63d257b93d231b61e181a8d6"`);
        await queryRunner.query(`DROP TABLE "form_submissions"`);
    }

}

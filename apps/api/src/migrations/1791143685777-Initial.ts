import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1791143685777 implements MigrationInterface {
    name = 'Initial1791143685777'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "collections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(40) NOT NULL, "name" jsonb NOT NULL DEFAULT '{}', "slugs" jsonb NOT NULL DEFAULT '{}', "fields" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1e18d9db47dfdf2c7962364e83e" UNIQUE ("key"), CONSTRAINT "PK_21c00b1ebbd41ba1354242c5c4e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "collection_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "status" character varying(16) NOT NULL DEFAULT 'draft', "cover" character varying NOT NULL DEFAULT '', "publishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "collectionId" uuid, CONSTRAINT "PK_5f299da96958a920ab58871ea57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1f7b77713fcdc512db06f1e68d" ON "collection_items" ("collectionId", "status", "publishedAt") `);
        await queryRunner.query(`CREATE TABLE "collection_item_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "collectionId" uuid NOT NULL, "locale" character varying(8) NOT NULL, "title" character varying NOT NULL DEFAULT '', "slug" character varying NOT NULL DEFAULT '', "excerpt" text NOT NULL DEFAULT '', "body" text NOT NULL DEFAULT '', "tags" jsonb NOT NULL DEFAULT '[]', "data" jsonb NOT NULL DEFAULT '{}', "seoDescription" character varying NOT NULL DEFAULT '', "itemId" uuid, CONSTRAINT "PK_8d9ba6be4ebe340f797f3d5ac9a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f9cca80c5ec7d53a00837b5af4" ON "collection_item_translations" ("itemId", "locale") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_612028fd57f6c7dbcf9367f965" ON "collection_item_translations" ("collectionId", "locale", "slug") `);
        await queryRunner.query(`CREATE TABLE "media" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "filename" character varying NOT NULL, "originalName" character varying NOT NULL, "mime" character varying NOT NULL, "size" integer NOT NULL, "url" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "isHome" boolean NOT NULL DEFAULT false, "status" character varying(16) NOT NULL DEFAULT 'draft', "publishedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8f21ed625aa34c8391d636b7d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "page_translations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "locale" character varying(8) NOT NULL, "title" character varying NOT NULL DEFAULT '', "slug" character varying NOT NULL DEFAULT '', "seoTitle" character varying NOT NULL DEFAULT '', "seoDescription" character varying NOT NULL DEFAULT '', "blocks" jsonb NOT NULL DEFAULT '[]', "publishedBlocks" jsonb, "pageId" uuid, CONSTRAINT "PK_cbd0b8990d151ff2b201cc104d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_568383b95c25e64ef1f28939a8" ON "page_translations" ("pageId", "locale") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3f729b0c1adb399e2ea6d42ccc" ON "page_translations" ("locale", "slug") `);
        await queryRunner.query(`CREATE TABLE "site_settings" ("id" integer NOT NULL DEFAULT '1', "siteName" jsonb NOT NULL DEFAULT '{}', "logo" character varying NOT NULL DEFAULT '', "favicon" character varying NOT NULL DEFAULT '', "theme" jsonb NOT NULL DEFAULT '{}', "menu" jsonb NOT NULL DEFAULT '[]', "maintenance" boolean NOT NULL DEFAULT false, "maintenanceText" jsonb NOT NULL DEFAULT '{}', "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e4290e8371a166d7e066d131f6e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "name" character varying NOT NULL DEFAULT '', "role" character varying(16) NOT NULL DEFAULT 'editor', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "collection_items" ADD CONSTRAINT "FK_e7236ab8c4b7959e544c818b26d" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collection_item_translations" ADD CONSTRAINT "FK_35dbe20ef746d8d3531842e7c8d" FOREIGN KEY ("itemId") REFERENCES "collection_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "page_translations" ADD CONSTRAINT "FK_ca91c5843203b89acff30e56cde" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "page_translations" DROP CONSTRAINT "FK_ca91c5843203b89acff30e56cde"`);
        await queryRunner.query(`ALTER TABLE "collection_item_translations" DROP CONSTRAINT "FK_35dbe20ef746d8d3531842e7c8d"`);
        await queryRunner.query(`ALTER TABLE "collection_items" DROP CONSTRAINT "FK_e7236ab8c4b7959e544c818b26d"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "site_settings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3f729b0c1adb399e2ea6d42ccc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_568383b95c25e64ef1f28939a8"`);
        await queryRunner.query(`DROP TABLE "page_translations"`);
        await queryRunner.query(`DROP TABLE "pages"`);
        await queryRunner.query(`DROP TABLE "media"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_612028fd57f6c7dbcf9367f965"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f9cca80c5ec7d53a00837b5af4"`);
        await queryRunner.query(`DROP TABLE "collection_item_translations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f7b77713fcdc512db06f1e68d"`);
        await queryRunner.query(`DROP TABLE "collection_items"`);
        await queryRunner.query(`DROP TABLE "collections"`);
    }

}

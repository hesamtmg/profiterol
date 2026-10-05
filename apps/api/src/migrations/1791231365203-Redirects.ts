import { MigrationInterface, QueryRunner } from 'typeorm';

export class Redirects1791231365203 implements MigrationInterface {
  name = 'Redirects1791231365203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "redirects" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "from" character varying(500) NOT NULL, "to" character varying(1000) NOT NULL, "status" integer NOT NULL DEFAULT '301', "hits" integer NOT NULL DEFAULT '0', "lastHitAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d81f0797728eb0eb92ae3c6eedd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_20fe55126abe4faea369673f93" ON "redirects" ("from") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_20fe55126abe4faea369673f93"`);
    await queryRunner.query(`DROP TABLE "redirects"`);
  }
}

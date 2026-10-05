import { MigrationInterface, QueryRunner } from 'typeorm';

export class PageHistorySchedule1791218072308 implements MigrationInterface {
  name = 'PageHistorySchedule1791218072308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "page_revisions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "kind" character varying(16) NOT NULL, "author" character varying NOT NULL DEFAULT '', "snapshot" jsonb NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "pageId" uuid, CONSTRAINT "PK_fe8d2a867b186dba64fcbc31b99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_af83fcd98d1c4173fc499f5f1c" ON "page_revisions" ("pageId", "createdAt") `);
    await queryRunner.query(`ALTER TABLE "pages" ADD "publishAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "pages" ADD "unpublishAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `ALTER TABLE "page_revisions" ADD CONSTRAINT "FK_80097b4d08abb892ff3e79530d4" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "page_revisions" DROP CONSTRAINT "FK_80097b4d08abb892ff3e79530d4"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "unpublishAt"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "publishAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_af83fcd98d1c4173fc499f5f1c"`);
    await queryRunner.query(`DROP TABLE "page_revisions"`);
  }
}

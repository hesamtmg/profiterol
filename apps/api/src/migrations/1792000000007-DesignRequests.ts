import { MigrationInterface, QueryRunner } from 'typeorm';

/** Designs sent from the sublimation designer block, with their preview and print file. */
export class DesignRequests1792000000007 implements MigrationInterface {
  name = 'DesignRequests1792000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "design_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "siteId" uuid NOT NULL,
        "pageId" uuid,
        "pageTitle" character varying NOT NULL DEFAULT '',
        "blockId" character varying(40) NOT NULL,
        "locale" character varying(8) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'new',
        "name" character varying(120) NOT NULL,
        "phone" character varying(40) NOT NULL,
        "email" character varying(200) NOT NULL DEFAULT '',
        "notes" text NOT NULL DEFAULT '',
        "product" character varying(120) NOT NULL,
        "surface" character varying(32) NOT NULL,
        "color" character varying(16) NOT NULL DEFAULT '',
        "material" character varying(80) NOT NULL DEFAULT '',
        "size" character varying(40) NOT NULL DEFAULT '',
        "quantity" integer NOT NULL DEFAULT 1,
        "details" jsonb NOT NULL,
        "adminNote" text NOT NULL DEFAULT '',
        "preview" bytea NOT NULL,
        "previewType" character varying(32) NOT NULL,
        "printFile" bytea NOT NULL,
        "printType" character varying(32) NOT NULL,
        "printBytes" integer NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_design_requests" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_design_requests_site_status" ON "design_requests" ("siteId", "status", "createdAt")`,
    );
    await queryRunner.query(
      `ALTER TABLE "design_requests" ADD CONSTRAINT "FK_c825606b6be11f24470ad02c221" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "design_requests"`);
  }
}

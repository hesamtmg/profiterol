import { MigrationInterface, QueryRunner } from 'typeorm';

/** The AI block builder: each site's own blocks, and the AI service settings (with an encrypted key). */
export class CustomBlocks1792000000002 implements MigrationInterface {
  name = 'CustomBlocks1792000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "ai" jsonb NOT NULL DEFAULT '{}'`);
    await queryRunner.query(
      `CREATE TABLE "custom_blocks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "siteId" uuid NOT NULL,
        "type" character varying(80) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'draft',
        "draft" jsonb NOT NULL,
        "live" jsonb,
        "conversation" jsonb NOT NULL DEFAULT '[]',
        "createdBy" character varying NOT NULL DEFAULT '',
        "approvedBy" character varying NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_blocks" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_custom_blocks_site_type" ON "custom_blocks" ("siteId", "type")`);
    await queryRunner.query(
      `ALTER TABLE "custom_blocks" ADD CONSTRAINT "FK_custom_blocks_site" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "custom_blocks"`);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "ai"`);
  }
}

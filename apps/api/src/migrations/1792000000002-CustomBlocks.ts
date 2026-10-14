import { MigrationInterface, QueryRunner } from 'typeorm';

/** The AI block builder: each site's own blocks, and each admin's own AI models (with encrypted keys) per site. */
export class CustomBlocks1792000000002 implements MigrationInterface {
  name = 'CustomBlocks1792000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_connections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "siteId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "name" character varying(80) NOT NULL,
        "provider" character varying(32) NOT NULL,
        "model" character varying(120) NOT NULL,
        "apiKeyEnc" text NOT NULL,
        "keyHint" character varying(8) NOT NULL DEFAULT '',
        "baseUrl" character varying(300) NOT NULL DEFAULT '',
        "isDefault" boolean NOT NULL DEFAULT false,
        "dailyLimit" integer NOT NULL DEFAULT 50,
        "usage" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_connections" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ai_connections_site_user" ON "ai_connections" ("siteId", "userId")`);
    await queryRunner.query(
      `ALTER TABLE "ai_connections" ADD CONSTRAINT "FK_ai_connections_site" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_connections" ADD CONSTRAINT "FK_ai_connections_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
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
    await queryRunner.query(`DROP TABLE "ai_connections"`);
  }
}

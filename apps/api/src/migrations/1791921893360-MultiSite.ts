import { MigrationInterface, QueryRunner } from 'typeorm';

/** Tables whose rows belong to one site. Existing rows all go to the first site. */
const SITE_TABLES = ['collections', 'form_submissions', 'media', 'pages', 'page_translations', 'redirects'];

/**
 * Several sites in one installation. Creates the sites table with one site that owns everything that exists, gives
 * every table a siteId, makes slugs, collection keys, redirects and emails unique per site, and turns the oldest
 * admin into the owner (who manages every site). The site gets its address from DOMAIN on the next start.
 */
export class MultiSite1791921893360 implements MigrationInterface {
  name = 'MultiSite1791921893360';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_5b63d257b93d231b61e181a8d6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3f729b0c1adb399e2ea6d42ccc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_20fe55126abe4faea369673f93"`);
    await queryRunner.query(
      `CREATE TABLE "sites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL DEFAULT '', "sslMode" character varying(16) NOT NULL DEFAULT 'off', "ssl" character varying(16) NOT NULL DEFAULT 'none', "sslMessage" text NOT NULL DEFAULT '', "sslExpires" TIMESTAMP WITH TIME ZONE, "sslAttempts" integer NOT NULL DEFAULT '0', "sslRetryAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4f5eccb1dfde10c9170502595a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "site_domains" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "siteId" uuid NOT NULL, "domain" character varying(253) NOT NULL, "primary" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_59a65164f2879f957acf95f4789" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_436406602998a01fdfa879a39b" ON "site_domains" ("domain") `);
    await queryRunner.query(
      `CREATE TABLE "ssl_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "siteId" uuid NOT NULL, "step" character varying(16) NOT NULL, "state" character varying(16) NOT NULL, "message" text NOT NULL DEFAULT '', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(), CONSTRAINT "PK_aab2850ca45ce63f7747cef1dec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_331f5e9b886302bf13c182a388" ON "ssl_events" ("siteId", "createdAt") `);

    // The first site owns everything that already exists.
    const [{ id: site }] = (await queryRunner.query(`INSERT INTO "sites" ("name") VALUES ('Main site') RETURNING "id"`)) as {
      id: string;
    }[];
    for (const table of SITE_TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD "siteId" uuid`);
      await queryRunner.query(`UPDATE "${table}" SET "siteId" = $1`, [site]);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "siteId" SET NOT NULL`);
    }

    // Settings: one row per site instead of the single row with id 1.
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "siteId" uuid`);
    await queryRunner.query(`DELETE FROM "site_settings" WHERE "id" <> 1`);
    await queryRunner.query(`UPDATE "site_settings" SET "siteId" = $1`, [site]);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP CONSTRAINT "PK_e4290e8371a166d7e066d131f6e"`);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "site_settings" ALTER COLUMN "siteId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "site_settings" ADD CONSTRAINT "PK_9b61a85357e691fcb17c4efb395" PRIMARY KEY ("siteId")`);
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "seo" jsonb NOT NULL DEFAULT '{}'`);

    // Users belong to the first site, except the oldest active admin, who becomes the owner of every site.
    await queryRunner.query(`ALTER TABLE "users" ADD "siteId" uuid`);
    await queryRunner.query(`UPDATE "users" SET "siteId" = $1`, [site]);
    await queryRunner.query(
      `UPDATE "users" SET "siteId" = NULL, "role" = 'owner'
         WHERE "id" = (SELECT "id" FROM "users" WHERE "role" = 'admin' AND "active" ORDER BY "createdAt" LIMIT 1)`,
    );

    await queryRunner.query(`ALTER TABLE "collection_items" ADD "noindex" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "pages" ADD "noindex" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "page_translations" ADD "ogImage" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "collections" DROP CONSTRAINT "UQ_1e18d9db47dfdf2c7962364e83e"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8e7037e096e3e836d45c2cc63d" ON "collections" ("siteId", "key") `);
    await queryRunner.query(`CREATE INDEX "IDX_5f9941c2d222ed5f481dc745bb" ON "form_submissions" ("siteId", "read", "createdAt") `);
    await queryRunner.query(`CREATE INDEX "IDX_b0888655783889c27af365832f" ON "media" ("siteId", "createdAt") `);
    await queryRunner.query(`CREATE INDEX "IDX_7d4b6c3c4c3ddaf51c2b3b9312" ON "pages" ("siteId") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2abc63e9b48fd96fe784417d68" ON "page_translations" ("siteId", "locale", "slug") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2f7470df762a51cadfb404c87c" ON "users" ("email") WHERE "siteId" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e7f47c3e2a0105cef0da13b22d" ON "users" ("siteId", "email") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_606a999b6e77add96b277f6f8e" ON "redirects" ("siteId", "from") `);
    await queryRunner.query(
      `ALTER TABLE "site_domains" ADD CONSTRAINT "FK_b64cc9e1f0a969eea87380c462d" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ssl_events" ADD CONSTRAINT "FK_44cb4679b030690f0356652cde0" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collections" ADD CONSTRAINT "FK_b46f7c378526d3bff18ee055ebc" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submissions" ADD CONSTRAINT "FK_3bb1ca3f6acfb327d6334daf190" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD CONSTRAINT "FK_84e21c57371e4fba7fba91846b7" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pages" ADD CONSTRAINT "FK_7d4b6c3c4c3ddaf51c2b3b9312e" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_translations" ADD CONSTRAINT "FK_88ce22badb13c13673cdc7b9122" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_0515424a6578918709b47d19d70" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "redirects" ADD CONSTRAINT "FK_227399ece9bd6a1a1d373da4f71" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_settings" ADD CONSTRAINT "FK_9b61a85357e691fcb17c4efb395" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  /** Back to one site. Only possible while there is one: the others' content would clash with it. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(`SELECT count(*)::int AS count FROM "sites"`)) as { count: number }[];
    if (count > 1) throw new Error('Delete the other sites first (Admin → Sites): only one site can be kept');

    await queryRunner.query(`ALTER TABLE "site_settings" DROP CONSTRAINT "FK_9b61a85357e691fcb17c4efb395"`);
    await queryRunner.query(`ALTER TABLE "redirects" DROP CONSTRAINT "FK_227399ece9bd6a1a1d373da4f71"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_0515424a6578918709b47d19d70"`);
    await queryRunner.query(`ALTER TABLE "page_translations" DROP CONSTRAINT "FK_88ce22badb13c13673cdc7b9122"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP CONSTRAINT "FK_7d4b6c3c4c3ddaf51c2b3b9312e"`);
    await queryRunner.query(`ALTER TABLE "media" DROP CONSTRAINT "FK_84e21c57371e4fba7fba91846b7"`);
    await queryRunner.query(`ALTER TABLE "form_submissions" DROP CONSTRAINT "FK_3bb1ca3f6acfb327d6334daf190"`);
    await queryRunner.query(`ALTER TABLE "collections" DROP CONSTRAINT "FK_b46f7c378526d3bff18ee055ebc"`);
    await queryRunner.query(`ALTER TABLE "ssl_events" DROP CONSTRAINT "FK_44cb4679b030690f0356652cde0"`);
    await queryRunner.query(`ALTER TABLE "site_domains" DROP CONSTRAINT "FK_b64cc9e1f0a969eea87380c462d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_606a999b6e77add96b277f6f8e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e7f47c3e2a0105cef0da13b22d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2f7470df762a51cadfb404c87c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2abc63e9b48fd96fe784417d68"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7d4b6c3c4c3ddaf51c2b3b9312"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b0888655783889c27af365832f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5f9941c2d222ed5f481dc745bb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8e7037e096e3e836d45c2cc63d"`);
    // Owners become the site's admins again; a site account with the same email gives way to the owner's.
    await queryRunner.query(`DELETE FROM "users" u WHERE u."siteId" IS NOT NULL AND EXISTS (SELECT 1 FROM "users" o WHERE o."siteId" IS NULL AND o.email = u.email)`);
    await queryRunner.query(`UPDATE "users" SET "role" = 'admin' WHERE "role" = 'owner'`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
    await queryRunner.query(`ALTER TABLE "collections" ADD CONSTRAINT "UQ_1e18d9db47dfdf2c7962364e83e" UNIQUE ("key")`);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "seo"`);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP CONSTRAINT "PK_9b61a85357e691fcb17c4efb395"`);
    await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "siteId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "siteId"`);
    await queryRunner.query(`ALTER TABLE "page_translations" DROP COLUMN "ogImage"`);
    await queryRunner.query(`ALTER TABLE "pages" DROP COLUMN "noindex"`);
    await queryRunner.query(`ALTER TABLE "collection_items" DROP COLUMN "noindex"`);
    for (const table of SITE_TABLES) await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "siteId"`);
    await queryRunner.query(`ALTER TABLE "site_settings" ADD "id" integer NOT NULL DEFAULT '1'`);
    await queryRunner.query(`ALTER TABLE "site_settings" ADD CONSTRAINT "PK_e4290e8371a166d7e066d131f6e" PRIMARY KEY ("id")`);
    await queryRunner.query(`DROP INDEX "public"."IDX_331f5e9b886302bf13c182a388"`);
    await queryRunner.query(`DROP TABLE "ssl_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_436406602998a01fdfa879a39b"`);
    await queryRunner.query(`DROP TABLE "site_domains"`);
    await queryRunner.query(`DROP TABLE "sites"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_20fe55126abe4faea369673f93" ON "redirects" ("from") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3f729b0c1adb399e2ea6d42ccc" ON "page_translations" ("locale", "slug") `);
    await queryRunner.query(`CREATE INDEX "IDX_5b63d257b93d231b61e181a8d6" ON "form_submissions" ("read", "createdAt") `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Previews made by a site's own admins (under that site's address), the owner's per-site permission and limits for
 * them, and the request to move a bought preview to the customer's address.
 */
export class SitePreviewHosts1792000000011 implements MigrationInterface {
  name = 'SitePreviewHosts1792000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" ADD "previewHostId" uuid`);
    await queryRunner.query(`ALTER TABLE "sites" ADD "convertRequest" character varying(253)`);
    await queryRunner.query(`ALTER TABLE "sites" ADD "previewsAllowed" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "sites" ADD "previewMax" integer NOT NULL DEFAULT '5'`);
    await queryRunner.query(`ALTER TABLE "sites" ADD "previewMaxDays" integer NOT NULL DEFAULT '30'`);
    await queryRunner.query(
      `ALTER TABLE "sites" ADD CONSTRAINT "FK_7d7324c8738985692573cdcb558" FOREIGN KEY ("previewHostId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" DROP CONSTRAINT "FK_7d7324c8738985692573cdcb558"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "previewMaxDays"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "previewMax"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "previewsAllowed"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "convertRequest"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "previewHostId"`);
  }
}

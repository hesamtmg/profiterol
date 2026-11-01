import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Whether a site's own admins may manage its SEO, sitemap and robots.txt (Admin → SEO), chosen by the owner site by
 * site. On by default, so the admins who could already change their SEO settings still can.
 */
export class SiteSeoAllowed1792000000012 implements MigrationInterface {
  name = 'SiteSeoAllowed1792000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" ADD "seoAllowed" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sites" DROP COLUMN "seoAllowed"`);
  }
}

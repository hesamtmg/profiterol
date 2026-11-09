import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Which sites may use each built-in block (Admin → Components). A block without a row stays on every site, so nothing
 * changes for existing sites until the owner restricts a block.
 */
export class BlockAccess1792000000013 implements MigrationInterface {
  name = 'BlockAccess1792000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "block_access" (
        "type" character varying(80) NOT NULL,
        "siteIds" jsonb NOT NULL DEFAULT '[]',
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_block_access" PRIMARY KEY ("type")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "block_access"`);
  }
}

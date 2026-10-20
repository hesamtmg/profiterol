import { MigrationInterface, QueryRunner } from 'typeorm';

/** How long each AI model may take to answer, set by the admin beside its daily limit. */
export class AiTimeout1792000000006 implements MigrationInterface {
  name = 'AiTimeout1792000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_connections" ADD "timeoutSeconds" integer NOT NULL DEFAULT 600`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ai_connections" DROP COLUMN "timeoutSeconds"`);
  }
}

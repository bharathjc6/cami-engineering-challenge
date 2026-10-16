import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive only: supports the list query's ORDER BY and the per-request
 * "latest note" lookup. No existing table or column is altered.
 */
export class ListIndexes1720000000000 implements MigrationInterface {
  name = 'ListIndexes1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_request_notes_request_id_created_at
      ON request_notes(request_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_requests_created_at
      ON customer_requests(created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_requests_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_request_notes_request_id_created_at;`);
  }
}

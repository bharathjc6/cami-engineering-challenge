import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive only: indexes for the request list query and a new table for
 * classification history. No existing table or column is altered.
 */
export class ListIndexesAndClassificationHistory1720000000000 implements MigrationInterface {
  name = 'ListIndexesAndClassificationHistory1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supports the list's ORDER BY and the per-request "latest note" lookup.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_request_notes_request_id_created_at
      ON request_notes(request_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_requests_created_at
      ON customer_requests(created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS classification_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid NULL REFERENCES customer_requests(id) ON DELETE SET NULL,
        message text NOT NULL,
        category varchar(32) NOT NULL,
        confidence double precision NOT NULL,
        provider varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_classification_history_category_created_at
      ON classification_history(category, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_classification_history_request_id
      ON classification_history(request_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS classification_history;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_customer_requests_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_request_notes_request_id_created_at;`);
  }
}

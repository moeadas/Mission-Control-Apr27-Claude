import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const connectionString = process.env.TEST_DATABASE_URL
const describeDatabase = connectionString ? describe : describe.skip
let sql: ReturnType<typeof postgres>

describeDatabase('deployed database runtime wiring', () => {
  beforeAll(() => {
    sql = postgres(connectionString!, { max: 1, connect_timeout: 10 })
  })

  afterAll(async () => {
    await sql?.end()
  })

  it('uses tenant-scoped primary keys for skills and pipelines', async () => {
    const rows = await sql.unsafe(
      "SELECT c.conrelid::regclass::text AS table_name, " +
      "array_agg(a.attname ORDER BY key_position.ordinality) AS columns " +
      "FROM pg_constraint c " +
      "JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS key_position(attnum, ordinality) ON true " +
      "JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = key_position.attnum " +
      "WHERE c.contype = 'p' AND c.conrelid IN ('skills'::regclass, 'pipelines'::regclass) " +
      "GROUP BY c.conrelid"
    )
    const keys = new Map(rows.map((row: any) => [row.table_name, row.columns]))
    expect(keys.get('skills')).toEqual(['agency_id', 'id'])
    expect(keys.get('pipelines')).toEqual(['agency_id', 'id'])
  })

  it('has composite pipeline foreign keys and a durable execution queue', async () => {
    const constraints = await sql.unsafe(
      "SELECT conname, pg_get_constraintdef(oid) AS definition " +
      "FROM pg_constraint " +
      "WHERE conname IN ('tasks_pipeline_id_fkey', 'workflow_instances_pipeline_id_fkey')"
    )
    expect(constraints).toHaveLength(2)
    for (const row of constraints) {
      expect(row.definition).toContain('FOREIGN KEY (agency_id, pipeline_id)')
      expect(row.definition).toContain('REFERENCES pipelines(agency_id, id)')
    }
    const tables = await sql.unsafe("SELECT to_regclass('public.execution_jobs')::text AS name")
    expect(tables[0]?.name).toBe('execution_jobs')
  })
})

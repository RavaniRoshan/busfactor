import { neonConfig, Pool } from "@neondatabase/serverless";

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function connectionString(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL ?? process.env.POSTGRES_URL;
}

export function hasDatabase(): boolean {
  return Boolean(connectionString());
}

export function getPool(): Pool {
  const url = connectionString();
  if (!url) throw new Error("No Postgres connection string is set");
  if (!pool) {
    // HTTP queries avoid needing a WebSocket in serverless runtimes.
    neonConfig.poolQueryViaFetch = true;
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const p = getPool();
      await p.query(
        `CREATE TABLE IF NOT EXISTS busfactor_store (
          namespace text NOT NULL,
          key text NOT NULL,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (namespace, key)
        )`
      );
      await p.query(
        `CREATE TABLE IF NOT EXISTS waitlist_entries (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          source text,
          campaign text,
          status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed','deleted'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_email_lower_idx
          ON waitlist_entries (lower(email));
        CREATE INDEX IF NOT EXISTS waitlist_entries_created_at_idx
          ON waitlist_entries (created_at DESC);`
      );
      await p.query(
        `CREATE TABLE IF NOT EXISTS report_feedback (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          report_slug text NOT NULL,
          helpful boolean NOT NULL,
          note text NOT NULL DEFAULT '',
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS report_feedback_slug_idx ON report_feedback (report_slug);
        CREATE INDEX IF NOT EXISTS report_feedback_created_at_idx
          ON report_feedback (created_at DESC);`
      );
      await p.query(
        `CREATE TABLE IF NOT EXISTS scan_jobs (
          id text PRIMARY KEY,
          status text NOT NULL CHECK (status IN ('running','complete','failed')),
          created_at timestamptz NOT NULL DEFAULT now(),
          started_at timestamptz NOT NULL DEFAULT now(),
          completed_at timestamptz,
          duration_ms integer,
          report_slug text,
          error_category text,
          cache_hit boolean NOT NULL DEFAULT false,
          model text,
          engine_version text NOT NULL DEFAULT '',
          rubric_version text NOT NULL DEFAULT '',
          prompt_version text NOT NULL DEFAULT '',
          cost_usd double precision NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS scan_jobs_created_at_idx ON scan_jobs (created_at DESC);
        CREATE INDEX IF NOT EXISTS scan_jobs_status_idx ON scan_jobs (status);`
      );
      await p.query(
        `CREATE TABLE IF NOT EXISTS scan_costs (
          id bigserial PRIMARY KEY,
          scan_id text NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
          provider text NOT NULL DEFAULT '',
          model text NOT NULL DEFAULT '',
          input_tokens integer NOT NULL DEFAULT 0,
          output_tokens integer NOT NULL DEFAULT 0,
          cached_tokens integer NOT NULL DEFAULT 0,
          requests integer NOT NULL DEFAULT 0,
          cost_usd double precision NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS scan_costs_scan_id_idx ON scan_costs (scan_id);
        CREATE INDEX IF NOT EXISTS scan_costs_created_at_idx ON scan_costs (created_at DESC);`
      );
    })();
  }
  return ready;
}

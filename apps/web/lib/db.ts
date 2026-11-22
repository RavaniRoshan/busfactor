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
    })();
  }
  return ready;
}

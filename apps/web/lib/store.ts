import { neonConfig, Pool } from "@neondatabase/serverless";

export interface ScanJob {
  id: string;
  status: "running" | "complete" | "failed";
  slug?: string;
  report?: unknown;
  error?: string;
  public: boolean;
}

export interface StoredReport {
  slug: string;
  report: unknown;
  public: boolean;
}

interface KV<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  count(): Promise<number>;
}

interface RateLimitStore extends KV<{ day: string; count: number }> {
  consume(key: string, day: string, max: number): Promise<boolean>;
}

interface SpendStore {
  get(): Promise<{ usd: number }>;
  add(usd: number): Promise<{ usd: number }>;
}

export interface Store {
  jobs: KV<ScanJob>;
  reports: KV<StoredReport>;
  reportCache: KV<{ report: unknown; slug: string }>;
  rateLimits: RateLimitStore;
  spend: SpendStore;
}

type GlobalStore = typeof globalThis & {
  __busfactorStore?: Store;
};

function memoryKV<T>(seed: Map<string, T>): KV<T> {
  return {
    async get(key) {
      return seed.get(key);
    },
    async set(key, value) {
      seed.set(key, value);
    },
    async count() {
      return seed.size;
    },
  };
}

function createMemoryStore(): Store {
  const globalStore = globalThis as GlobalStore;
  if (globalStore.__busfactorStore) return globalStore.__busfactorStore;

  const jobs = new Map<string, ScanJob>();
  const reports = new Map<string, StoredReport>();
  const reportCache = new Map<string, { report: unknown; slug: string }>();
  const rateLimits = new Map<string, { day: string; count: number }>();
  const spend = { usd: 0 };

  const store: Store = {
    jobs: memoryKV(jobs),
    reports: memoryKV(reports),
    reportCache: memoryKV(reportCache),
    rateLimits: {
      ...memoryKV(rateLimits),
      async consume(key, day, max) {
        const current = rateLimits.get(key);
        if (!current || current.day !== day) {
          rateLimits.set(key, { day, count: 1 });
          return true;
        }
        if (current.count >= max) return false;
        current.count += 1;
        return true;
      },
    },
    spend: {
      async get() {
        return { usd: spend.usd };
      },
      async add(usd) {
        spend.usd += usd;
        return { usd: spend.usd };
      },
    },
  };
  globalStore.__busfactorStore = store;
  return store;
}

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (!pool) {
    // HTTP queries avoid needing a WebSocket in serverless runtimes.
    neonConfig.poolQueryViaFetch = true;
    pool = new Pool({ connectionString });
  }
  return pool;
}

function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS busfactor_store (
          namespace text NOT NULL,
          key text NOT NULL,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (namespace, key)
        )`
      )
      .then(() => undefined);
  }
  return ready;
}

function pgKV<T>(namespace: string): KV<T> {
  return {
    async get(key) {
      await ensureSchema();
      const result = await getPool().query(
        `SELECT value FROM busfactor_store WHERE namespace = $1 AND key = $2`,
        [namespace, key]
      );
      return result.rows[0]?.value as T | undefined;
    },
    async set(key, value) {
      await ensureSchema();
      await getPool().query(
        `INSERT INTO busfactor_store (namespace, key, value) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (namespace, key) DO UPDATE SET value = $3::jsonb, updated_at = now()`,
        [namespace, key, JSON.stringify(value)]
      );
    },
    async count() {
      await ensureSchema();
      const result = await getPool().query(
        `SELECT count(*)::int AS count FROM busfactor_store WHERE namespace = $1`,
        [namespace]
      );
      return Number(result.rows[0]?.count ?? 0);
    },
  };
}

function createPostgresStore(): Store {
  return {
    jobs: pgKV<ScanJob>("jobs"),
    reports: pgKV<StoredReport>("reports"),
    reportCache: pgKV<{ report: unknown; slug: string }>("report_cache"),
    rateLimits: {
      ...pgKV<{ day: string; count: number }>("rate_limits"),
      async consume(key, day, max) {
        await ensureSchema();
        const value = JSON.stringify({ day, count: 1 });
        const result = await getPool().query(
          `INSERT INTO busfactor_store (namespace, key, value) VALUES ('rate_limits', $1, $2::jsonb)
           ON CONFLICT (namespace, key) DO UPDATE SET
             value = CASE WHEN busfactor_store.value->>'day' = $3
               THEN jsonb_set(busfactor_store.value, '{count}', to_jsonb((busfactor_store.value->>'count')::int + 1))
               ELSE $2::jsonb END,
             updated_at = now()
           RETURNING (value->>'count')::int AS count`,
          [key, value, day]
        );
        return Number(result.rows[0]?.count ?? 0) <= max;
      },
    },
    spend: {
      async get() {
        await ensureSchema();
        const result = await getPool().query(
          `SELECT value FROM busfactor_store WHERE namespace = 'meta' AND key = 'spend'`
        );
        return { usd: Number(result.rows[0]?.value?.usd ?? 0) };
      },
      async add(usd) {
        await ensureSchema();
        const result = await getPool().query(
          `INSERT INTO busfactor_store (namespace, key, value) VALUES ('meta', 'spend', $1::jsonb)
           ON CONFLICT (namespace, key) DO UPDATE SET
             value = jsonb_set(COALESCE(busfactor_store.value, '{"usd":0}'::jsonb), '{usd}',
               to_jsonb(COALESCE((busfactor_store.value->>'usd')::numeric, 0) + $2::numeric)),
             updated_at = now()
           RETURNING value`,
          [JSON.stringify({ usd }), usd]
        );
        return { usd: Number(result.rows[0]?.value?.usd ?? 0) };
      },
    },
  };
}

export const store: Store = process.env.DATABASE_URL ? createPostgresStore() : createMemoryStore();

export function makeSlug() {
  return Math.random().toString(36).slice(2, 10);
}

import { ensureSchema, getPool, hasDatabase } from "./db";

export interface StoredReport {
  slug: string;
  report: unknown;
  public: boolean;
}

interface KV<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
  count(): Promise<number>;
  values(): Promise<T[]>;
}

interface RateLimitStore extends KV<{ day: string; count: number }> {
  consume(key: string, day: string, max: number): Promise<boolean>;
}

export interface Store {
  reports: KV<StoredReport>;
  reportCache: KV<{ report: unknown; slug: string; createdAt?: number }>;
  rateLimits: RateLimitStore;
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
    async values() {
      return [...seed.values()];
    },
  };
}

function createMemoryStore(): Store {
  const globalStore = globalThis as GlobalStore;
  if (globalStore.__busfactorStore) return globalStore.__busfactorStore;

  const reports = new Map<string, StoredReport>();
  const reportCache = new Map<string, { report: unknown; slug: string; createdAt?: number }>();
  const rateLimits = new Map<string, { day: string; count: number }>();

  const store: Store = {
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
  };
  globalStore.__busfactorStore = store;
  return store;
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
    async values() {
      await ensureSchema();
      const result = await getPool().query(
        `SELECT value FROM busfactor_store WHERE namespace = $1 ORDER BY updated_at DESC`,
        [namespace]
      );
      return result.rows.map((row) => row.value as T);
    },
  };
}

function createPostgresStore(): Store {
  return {
    reports: pgKV<StoredReport>("reports"),
    reportCache: pgKV<{ report: unknown; slug: string; createdAt?: number }>("report_cache"),
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
  };
}

export const store: Store = hasDatabase() ? createPostgresStore() : createMemoryStore();

export function makeSlug() {
  return Math.random().toString(36).slice(2, 10);
}

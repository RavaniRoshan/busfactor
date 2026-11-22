import { ensureSchema, getPool, hasDatabase } from "./db";

export interface SpendStore {
  get(day: string): Promise<number>;
  reserve(day: string, amountUsd: number, capUsd: number): Promise<{ ok: boolean; usd: number }>;
  settle(day: string, reservedUsd: number, actualUsd: number): Promise<{ usd: number }>;
}

type MemoryDay = { usd: number };
type MemoryState = { days: Map<string, MemoryDay>; chain: Promise<void> };
type GlobalSpend = typeof globalThis & { __busfactorSpendStore?: MemoryState };

function memoryState(): MemoryState {
  const g = globalThis as GlobalSpend;
  if (!g.__busfactorSpendStore) {
    g.__busfactorSpendStore = { days: new Map(), chain: Promise.resolve() };
  }
  return g.__busfactorSpendStore;
}

export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function createMemorySpendStore(): SpendStore {
  const state = memoryState();
  const runSerialized = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    const next = state.chain.then(fn, fn);
    state.chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  return {
    async get(day) {
      return state.days.get(day)?.usd ?? 0;
    },
    async reserve(day, amountUsd, capUsd) {
      return runSerialized(() => {
        const current = state.days.get(day)?.usd ?? 0;
        const next = roundUsd(current + amountUsd);
        if (next > capUsd) {
          return { ok: false, usd: current };
        }
        state.days.set(day, { usd: next });
        return { ok: true, usd: next };
      });
    },
    async settle(day, reservedUsd, actualUsd) {
      return runSerialized(() => {
        const current = state.days.get(day)?.usd ?? 0;
        const next = Math.max(0, roundUsd(current - reservedUsd + actualUsd));
        state.days.set(day, { usd: next });
        return { usd: next };
      });
    },
  };
}

function createPostgresSpendStore(): SpendStore {
  return {
    async get(day) {
      await ensureSchema();
      const result = await getPool().query(`SELECT usd FROM daily_spend WHERE day = $1::date`, [day]);
      return Number(result.rows[0]?.usd ?? 0);
    },
    async reserve(day, amountUsd, capUsd) {
      await ensureSchema();
      const pool = getPool();
      const inserted = await pool.query(
        `INSERT INTO daily_spend (day, usd) VALUES ($1::date, $2)
         ON CONFLICT (day) DO UPDATE SET usd = daily_spend.usd + $2
         WHERE daily_spend.usd + $2 <= $3
         RETURNING usd`,
        [day, amountUsd, capUsd]
      );
      if (inserted.rows[0]) {
        return { ok: true, usd: Number(inserted.rows[0].usd) };
      }
      const current = await pool.query(`SELECT usd FROM daily_spend WHERE day = $1::date`, [day]);
      return { ok: false, usd: Number(current.rows[0]?.usd ?? 0) };
    },
    async settle(day, reservedUsd, actualUsd) {
      await ensureSchema();
      const result = await getPool().query(
        `UPDATE daily_spend
         SET usd = GREATEST(0, usd - $2 + $3)
         WHERE day = $1::date
         RETURNING usd`,
        [day, reservedUsd, actualUsd]
      );
      if (result.rows[0]) return { usd: Number(result.rows[0].usd) };
      const current = await getPool().query(`SELECT usd FROM daily_spend WHERE day = $1::date`, [day]);
      return { usd: Number(current.rows[0]?.usd ?? 0) };
    },
  };
}

export const spendStore: SpendStore = hasDatabase() ? createPostgresSpendStore() : createMemorySpendStore();

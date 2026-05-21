// In-memory SQLite database for the test environment.
// Wraps better-sqlite3 with the same async API as @tursodatabase/serverless
// so every module that imports turso-db.js gets this stub instead during Jest runs.

import BetterSQLite from 'better-sqlite3';

const sqlite = new BetterSQLite(':memory:');

// Mirror the normalizeArgs logic used by @tursodatabase/serverless:
// a plain array is used as-is, a single scalar is wrapped, undefined → [].
function normalizeArgs(args: unknown): unknown[] {
  if (args === undefined || args === null) return [];
  if (Array.isArray(args)) return args;
  if (typeof args === 'object' && (args as any).constructor === Object) return [args];
  return [args];
}

const testDb = {
  // DDL (CREATE TABLE …)
  async exec(sql: string): Promise<void> {
    sqlite.exec(sql);
  },

  // SELECT without bind params — returns all rows as plain objects
  async all(sql: string): Promise<any[]> {
    return sqlite.prepare(sql).all() as any[];
  },

  // SELECT … LIMIT 1 without bind params — returns first row or undefined
  async get(sql: string): Promise<any> {
    return sqlite.prepare(sql).get() as any;
  },

  // Prepared statement with bind params
  async prepare(sql: string) {
    const stmt = sqlite.prepare(sql);
    return {
      async all(args?: unknown): Promise<any[]> {
        return stmt.all(...(normalizeArgs(args) as any[])) as any[];
      },
      async get(args?: unknown): Promise<any> {
        return stmt.get(...(normalizeArgs(args) as any[])) as any;
      },
      async run(args?: unknown): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
        return stmt.run(...(normalizeArgs(args) as any[]));
      },
    };
  },

  async close(): Promise<void> {
    sqlite.close();
  },
};

export default testDb;

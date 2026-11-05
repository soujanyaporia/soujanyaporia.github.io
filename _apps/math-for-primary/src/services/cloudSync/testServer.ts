import { createWorker, type Env } from '../../../cloudflare-worker/src/index';
/** SQL-shaped test double; real D1 smoke checks run separately through Wrangler. */
export function testServer() {
  const rows = new Map<string, any>(), worker = createWorker();
  const DB: Env['DB'] = { prepare(sql: string) { let values: any[] = []; return {
    bind(...v: unknown[]) { values = v; return this; },
    async first<T>() { const row = rows.get(values[0]); return row ? { ...row } as T : null; },
    async run() {
      let changes = 0;
      if (sql.startsWith('INSERT')) { if (!rows.has(values[0])) { const [account_id, write_verifier, iv, ciphertext, schema_version, updated_at] = values; rows.set(account_id, { account_id, write_verifier, iv, ciphertext, schema_version, revision: 1, updated_at }); changes = 1; } }
      else if (sql.startsWith('UPDATE')) { const [iv, ciphertext, schema_version, updated_at, id, revision, verifier] = values, row = rows.get(id); if (row?.revision === revision && row.write_verifier === verifier) { rows.set(id, { ...row, iv, ciphertext, schema_version, updated_at, revision: revision + 1 }); changes = 1; } }
      else if (sql.startsWith('DELETE')) { const row = rows.get(values[0]); if (row?.write_verifier === values[1]) { rows.delete(values[0]); changes = 1; } }
      return { meta: { changes } };
    },
  }; } };
  const requests: { url: string; method: string; body?: string; headers: Headers }[] = [];
  const fetcher: typeof fetch = async (input, init) => { const request = new Request(input, init); request.headers.set('Origin', 'http://localhost:5174'); requests.push({ url: request.url, method: request.method, body: init?.body as string | undefined, headers: request.headers }); return worker.fetch(request, { DB, ALLOWED_ORIGINS: 'http://localhost:5174' }); };
  return { rows, requests, fetch: fetcher, worker, env: { DB, ALLOWED_ORIGINS: 'http://localhost:5174' } };
}
export function memoryStorage() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, m }; }

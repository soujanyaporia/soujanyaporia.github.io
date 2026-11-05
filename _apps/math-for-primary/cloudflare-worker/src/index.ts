// No third-party runtime dependencies. No request, token, body or IP logging.
interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Env { DB: { prepare(sql: string): Statement }; ALLOWED_ORIGINS: string; MAX_CIPHERTEXT_CHARS?: string }
interface Row { account_id: string; write_verifier: string; iv: string; ciphertext: string; schema_version: number; revision: number; updated_at: number }
const HEX = /^[a-f0-9]{64}$/;
export async function sha256Hex(input: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)))].map(x => x.toString(16).padStart(2, '0')).join(''); }
/** Fixed-length comparison without data-dependent early exits. JS runtimes cannot promise machine-level constant time. */
export function timingSafeEqualHex(a: string, b: string) { let diff = a.length ^ b.length; for (let i = 0; i < 64; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diff === 0; }
/** Bounded sliding windows, scoped to a single isolate; not global abuse prevention. IPs never reach D1. */
export class RateLimiter {
  private windows = new Map<string, number[]>();
  allow(ip: string, write: boolean, now = Date.now()) {
    for (const [key, times] of this.windows) if (!times.length || times[times.length - 1] <= now - 60000) this.windows.delete(key);
    const key = `${write ? 'w' : 'r'}:${ip}`, recent = (this.windows.get(key) ?? []).filter(t => t > now - 60000);
    if (recent.length >= (write ? 30 : 60)) return false;
    if (!this.windows.has(key) && this.windows.size >= 10000) return false;
    recent.push(now); this.windows.set(key, recent); return true;
  }
}
class BodyError extends Error { constructor(public status: number, public code: string) { super(code); } }
async function boundedJson(request: Request, max: number): Promise<any> {
  const declared = request.headers.get('Content-Length'); if (declared && Number(declared) > max) throw new BodyError(413, 'PAYLOAD_TOO_LARGE');
  if (!request.body) throw new BodyError(400, 'INVALID_BODY');
  const reader = request.body.getReader(); let size = 0, text = ''; const decoder = new TextDecoder('utf-8', { fatal: true });
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) throw new BodyError(413, 'PAYLOAD_TOO_LARGE'); text += decoder.decode(value, { stream: true }); } text += decoder.decode(); return JSON.parse(text); }
  catch (e) { if (e instanceof BodyError) throw e; throw new BodyError(400, 'INVALID_JSON'); }
  finally { await reader.cancel(); }
}
function base64(value: unknown, bytes?: number) {
  if (typeof value !== 'string' || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return false;
  try { const decoded = atob(value); return btoa(decoded) === value && (bytes === undefined ? decoded.length >= 16 : decoded.length === bytes); } catch { return false; }
}
export function createWorker(limiter = new RateLimiter()) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const origin = request.headers.get('Origin'), allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).includes(origin ?? '');
      const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin', 'Content-Type': 'application/json; charset=utf-8' };
      if (allowed && origin) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Write-Token', 'Access-Control-Max-Age': '86400' });
      const reply = (status: number, body: unknown, extra: Record<string, string> = {}) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { ...headers, ...extra } });
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/api/v1/health') return origin && !allowed ? reply(403, { error: 'ORIGIN_NOT_ALLOWED' }) : reply(200, { ok: true, service: 'sg-primary-maths-sync' });
      if (!origin || !allowed) return reply(403, { error: 'ORIGIN_NOT_ALLOWED' });
      if (request.method === 'OPTIONS') return reply(204, null);
      if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return reply(405, { error: 'METHOD_NOT_ALLOWED' });
      const match = /^\/api\/v1\/sync\/([^/]+)$/.exec(url.pathname); if (!match) return reply(404, { error: 'NOT_FOUND' });
      const id = match[1]; if (!HEX.test(id)) return reply(400, { error: 'INVALID_ACCOUNT_ID' });
      if (!limiter.allow(request.headers.get('CF-Connecting-IP') || 'anon', request.method !== 'GET')) return reply(429, { error: 'RATE_LIMITED' }, { 'Retry-After': '60' });
      try {
        if (request.method === 'GET') {
          const row = await env.DB.prepare('SELECT account_id, iv, ciphertext, schema_version, revision, updated_at FROM encrypted_profiles WHERE account_id = ?1').bind(id).first<Row>();
          return row ? reply(200, { accountId: row.account_id, iv: row.iv, ciphertext: row.ciphertext, schemaVersion: row.schema_version, revision: row.revision, updatedAt: row.updated_at }) : reply(404, { error: 'ACCOUNT_NOT_FOUND' });
        }
        const token = request.headers.get('X-Write-Token') ?? ''; if (!HEX.test(token)) return reply(400, { error: 'INVALID_WRITE_TOKEN' });
        const verifier = await sha256Hex(token);
        if (request.method === 'DELETE') {
          const row = await env.DB.prepare('SELECT write_verifier, revision FROM encrypted_profiles WHERE account_id = ?1').bind(id).first<Row>();
          if (!row) return reply(404, { error: 'ACCOUNT_NOT_FOUND' });
          if (!timingSafeEqualHex(row.write_verifier, verifier)) return reply(403, { error: 'INVALID_WRITE_TOKEN' });
          await env.DB.prepare('DELETE FROM encrypted_profiles WHERE account_id = ?1 AND write_verifier = ?2').bind(id, verifier).run();
          return reply(200, { ok: true, deleted: true });
        }
        if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply(415, { error: 'JSON_REQUIRED' });
        const max = Math.min(131072, Math.max(24, Number(env.MAX_CIPHERTEXT_CHARS) || 131072));
        const body = await boundedJson(request, max + 512);
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['iv', 'ciphertext', 'schemaVersion', 'baseRevision'].includes(k))) return reply(400, { error: 'INVALID_BODY' });
        const { iv, ciphertext, schemaVersion = 1, baseRevision } = body;
        if (typeof ciphertext === 'string' && ciphertext.length > max) return reply(413, { error: 'PAYLOAD_TOO_LARGE' });
        if (!base64(iv, 12) || !base64(ciphertext) || schemaVersion !== 1) return reply(400, { error: 'INVALID_ENVELOPE' });
        if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) return reply(400, { error: 'BASE_REVISION_REQUIRED' });
        const row = await env.DB.prepare('SELECT write_verifier, revision FROM encrypted_profiles WHERE account_id = ?1').bind(id).first<Row>();
        const now = Date.now();
        if (!row) {
          // A stale device cannot silently recreate an account after another device deleted it.
          if (baseRevision !== 0) return reply(404, { error: 'ACCOUNT_NOT_FOUND' });
          const r = await env.DB.prepare('INSERT INTO encrypted_profiles (account_id, write_verifier, iv, ciphertext, schema_version, revision, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6) ON CONFLICT(account_id) DO NOTHING').bind(id, verifier, iv, ciphertext, schemaVersion, now).run();
          return r.meta.changes === 1 ? reply(201, { ok: true, revision: 1, updatedAt: now }) : reply(409, { error: 'REVISION_CONFLICT' });
        }
        if (!timingSafeEqualHex(row.write_verifier, verifier)) return reply(403, { error: 'INVALID_WRITE_TOKEN' });
        if (baseRevision !== row.revision) return reply(409, { error: 'REVISION_CONFLICT', revision: row.revision });
        const r = await env.DB.prepare('UPDATE encrypted_profiles SET iv = ?1, ciphertext = ?2, schema_version = ?3, revision = revision + 1, updated_at = ?4 WHERE account_id = ?5 AND revision = ?6 AND write_verifier = ?7').bind(iv, ciphertext, schemaVersion, now, id, baseRevision, verifier).run();
        return r.meta.changes === 1 ? reply(200, { ok: true, revision: baseRevision + 1, updatedAt: now }) : reply(409, { error: 'REVISION_CONFLICT' });
      } catch (e) { return e instanceof BodyError ? reply(e.status, { error: e.code }) : reply(503, { error: 'SERVICE_UNAVAILABLE' }); }
    },
  };
}
export default createWorker();

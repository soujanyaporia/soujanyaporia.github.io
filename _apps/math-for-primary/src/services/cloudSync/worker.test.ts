import { describe, expect, it } from 'vitest';
import { RateLimiter, sha256Hex, timingSafeEqualHex } from '../../../cloudflare-worker/src/index';
import { testServer } from './testServer';
const id = 'a'.repeat(64), token = 'b'.repeat(64), url = `https://test.example/api/v1/sync/${id}`;
const body = { iv: btoa('123456789012'), ciphertext: btoa('abcdefghijklmnop'), schemaVersion: 1, baseRevision: 0 };
const write = (data = body, writeToken = token) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Write-Token': writeToken }, body: JSON.stringify(data) });
describe('Worker authentication, limits and atomic revisions', () => {
  it('creates, reads, rejects incorrect tokens and deletes only with write authorization', async () => {
    const server = testServer(); expect((await server.fetch(url)).status).toBe(404);
    expect((await server.fetch(url, write())).status).toBe(201); expect(server.rows.get(id).write_verifier).toBe(await sha256Hex(token)); expect(server.rows.get(id).write_verifier).not.toBe(token);
    const get = await server.fetch(url); expect(get.headers.get('Cache-Control')).toBe('no-store'); expect(get.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5174'); expect(await get.json()).not.toHaveProperty('write_verifier');
    expect((await server.fetch(url, write({ ...body, baseRevision: 1 }, 'c'.repeat(64)))).status).toBe(403);
    expect((await server.fetch(url, { method: 'DELETE', headers: { 'X-Write-Token': 'c'.repeat(64) } })).status).toBe(403);
    expect((await server.fetch(url, { method: 'DELETE', headers: { 'X-Write-Token': token } })).status).toBe(200); expect(server.rows.size).toBe(0);
    expect((await server.fetch(url, write({ ...body, baseRevision: 1 }))).status).toBe(404);
  });
  it('atomically allows only one concurrent update and one concurrent creation', async () => {
    const s = testServer(); expect((await Promise.all([s.fetch(url, write()), s.fetch(url, write())])).map(r => r.status).sort()).toEqual([201, 409]);
    expect((await Promise.all([s.fetch(url, write({ ...body, baseRevision: 1 })), s.fetch(url, write({ ...body, baseRevision: 1 }))])).map(r => r.status).sort()).toEqual([200, 409]); expect(s.rows.get(id).revision).toBe(2);
  });
  it('validates origins, preflight, IV bytes, schema, revision and streaming size limits', async () => {
    const s = testServer(); const denied = await s.worker.fetch(new Request(url, { headers: { Origin: 'https://evil.example' } }), s.env); expect(denied.status).toBe(403); expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect((await s.fetch(url, { method: 'OPTIONS' })).status).toBe(204);
    for (const bad of [{ ...body, iv: btoa('short') }, { ...body, schemaVersion: 2 }, { ...body, baseRevision: undefined }, { ...body, nickname: 'Never accept plaintext' }]) expect((await s.fetch(url, write(bad as typeof body))).status).toBe(400);
    expect((await s.fetch(url, write({ ...body, ciphertext: 'a'.repeat(140000) }))).status).toBe(413);
  });
  it('limits independent read/write sliding windows and handles expiry', () => { const limiter = new RateLimiter(); for (let i = 0; i < 30; i++) expect(limiter.allow('ip', true, 1000)).toBe(true); expect(limiter.allow('ip', true, 2000)).toBe(false); expect(limiter.allow('ip', false, 2000)).toBe(true); expect(limiter.allow('ip', true, 61001)).toBe(true); });
  it('compares all fixed-length verifier characters', () => { expect(timingSafeEqualHex(id, id)).toBe(true); expect(timingSafeEqualHex(id, token)).toBe(false); expect(timingSafeEqualHex(id, id.slice(1))).toBe(false); });
});

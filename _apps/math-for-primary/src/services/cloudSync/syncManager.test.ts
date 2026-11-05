import { afterEach, describe, expect, it } from 'vitest';
import { initialProgress } from '../../state/progress';
import { decryptProgress, deriveKeys } from './crypto';
import { type CloudState } from './mergeProgress';
import { SyncManager, type SyncOptions } from './syncManager';
import { memoryStorage, testServer } from './testServer';
import { SESSION_KEY } from './storage';
const phrase = 'sunny-otter-hexagon-mango-42';
const managers: SyncManager[] = [];
afterEach(() => { for (const m of managers.splice(0)) m.dispose(); });
function device(fetcher: typeof fetch, extra: Partial<SyncOptions> = {}) {
  let state: CloudState = { format: 1, progress: initialProgress(1), checkpoints: {} }, wiped = false;
  const local = memoryStorage(), tab = memoryStorage();
  const manager = new SyncManager({ endpoint: 'https://test.example', fetch: fetcher, local, tab, read: () => state, apply: next => { state = next; }, wipe: () => { wiped = true; }, ...extra }); managers.push(manager);
  return { manager, local, tab, get state() { return state; }, get wiped() { return wiped; }, edit(xp: number) { state = { ...state, progress: { ...state.progress, xp } }; manager.markDirty(); } };
}
describe('offline-first synchronization lifecycle', () => {
  it('creates encrypted accounts, stores only derived credentials, and restores/merges another device', async () => {
    const server = testServer(), a = device(server.fetch); a.state.progress.profile.name = 'Private otter'; a.edit(40); await a.manager.connect(phrase, 'create'); expect(await a.manager.syncNow()).toBe(true);
    const record = JSON.parse(a.local.getItem(SESSION_KEY)!); expect(record.accountId).toMatch(/^[a-f0-9]{64}$/); expect(record.exportedAesKeyJwk.kty).toBe('oct'); expect(JSON.stringify(record)).not.toContain(phrase);
    for (const request of server.requests) { expect(request.url).not.toContain(phrase); expect(request.body ?? '').not.toContain('Private otter'); if (request.body) expect(Object.keys(JSON.parse(request.body)).sort()).toEqual(['baseRevision','ciphertext','iv','schemaVersion']); expect(request.body ?? '').not.toContain(record.exportedAesKeyJwk.k); }
    const b = device(server.fetch); b.edit(75); await b.manager.connect(phrase, 'restore'); expect(b.state.progress.xp).toBe(75); expect(b.state.progress.profile.name).toBe('Private otter'); expect(await b.manager.syncNow()).toBe(true); await a.manager.syncNow(); expect(a.state.progress.xp).toBe(75);
  });
  it('keeps offline edits and saves them after reconnecting', async () => {
    const server = testServer(); let online = true; const a = device(server.fetch, { online: () => online }); await a.manager.connect(phrase, 'create'); await a.manager.syncNow(); online = false; a.edit(120); expect(await a.manager.syncNow()).toBe(false); expect(a.manager.view.status).toBe('offline-saved-locally'); expect(a.state.progress.xp).toBe(120); online = true; expect(await a.manager.syncNow()).toBe(true); expect(a.manager.view.status).toBe('synced');
  });
  it('does not clear dirty changes made while a PUT is in flight', async () => {
    const server = testServer(); let intercept = false, mutate = () => {};
    const a = device(async (url, init) => { if (intercept && init?.method === 'PUT') { intercept = false; mutate(); } return server.fetch(url, init); }); await a.manager.connect(phrase, 'create'); await a.manager.syncNow(); a.edit(100); mutate = () => a.edit(200); intercept = true;
    expect(await a.manager.syncNow()).toBe(false); expect(a.manager.view.status).toBe('pending'); expect(a.state.progress.xp).toBe(200); expect(await a.manager.syncNow()).toBe(true);
    const keys = await deriveKeys(phrase), row = server.rows.get(keys.accountId); expect((await decryptProgress({ ...row, schemaVersion: row.schema_version }, keys.aesKey, keys.accountId) as CloudState).progress.xp).toBe(200);
  });
  it('retries revision conflicts and converges two simultaneous devices', async () => {
    const server = testServer(), a = device(server.fetch), b = device(server.fetch); await a.manager.connect(phrase, 'create'); await a.manager.syncNow(); await b.manager.connect(phrase, 'restore'); await b.manager.syncNow();
    a.state.progress.inventory.push('hat-otter'); b.state.progress.inventory.push('hat-mango'); a.edit(70); b.edit(90);
    await Promise.all([a.manager.syncNow(), b.manager.syncNow()]); await Promise.all([a.manager.syncNow(), b.manager.syncNow()]);
    expect(a.state).toEqual(b.state); expect(a.state.progress.inventory).toEqual(expect.arrayContaining(['hat-otter', 'hat-mango']));
  });
  it('keeps shared credentials out of localStorage and requires final save before wiping', async () => {
    const server = testServer(); let online = true; const a = device(server.fetch, { online: () => online }); await a.manager.connect(phrase, 'create', true); expect(a.local.getItem(SESSION_KEY)).toBeNull(); expect(a.tab.getItem(SESSION_KEY)).not.toBeNull(); a.edit(200); online = false; await expect(a.manager.logout()).rejects.toThrow('Finish saving'); expect(a.wiped).toBe(false); expect(a.manager.view.connected).toBe(true); online = true; await a.manager.logout(); expect(a.wiped).toBe(true); expect(a.tab.getItem(SESSION_KEY)).toBeNull(); expect(a.manager.view.connected).toBe(false);
  });
  it('does not recreate a deleted account from an already connected device', async () => {
    const server = testServer(), a = device(server.fetch), b = device(server.fetch); await a.manager.connect(phrase, 'create'); await a.manager.syncNow(); await b.manager.connect(phrase, 'restore'); await b.manager.syncNow(); await a.manager.deleteCloud(); b.edit(300); expect(await b.manager.syncNow()).toBe(false); expect(b.manager.view.error).toContain('not be recreated'); expect(server.rows.size).toBe(0);
  });
  it('does not create an account when a restore code is unknown', async () => { const server = testServer(), a = device(server.fetch); await expect(a.manager.connect(phrase, 'restore')).rejects.toThrow('No cloud backup'); expect(server.rows.size).toBe(0); expect(a.local.getItem(SESSION_KEY)).toBeNull(); });
  it('supports offline encrypted export/import and rejects wrong codes without mutations', async () => {
    const server = testServer(), a = device(server.fetch); await a.manager.connect(phrase, 'create'); a.edit(1200); const backup = await a.manager.exportEncrypted(), b = device(server.fetch); const before = JSON.stringify(b.state);
    await expect(b.manager.importBackup(backup, 'sunny-otter-hexagon-mango-43')).rejects.toThrow('recovery code'); expect(JSON.stringify(b.state)).toBe(before); await b.manager.importBackup(backup, phrase); expect(b.state.progress.xp).toBe(1200); expect(b.manager.view.connected).toBe(false);
  });
  it('imports a persisted derived key and never stores the full recovery code', async () => {
    const server = testServer(), a = device(server.fetch); await a.manager.connect(phrase, 'create'); await a.manager.syncNow(); const b = device(server.fetch, { local: a.local }); await b.manager.resume(); expect(b.manager.view.connected).toBe(true); await expect(b.manager.revealCode()).rejects.toThrow('Re-enter'); expect(await b.manager.revealCode(phrase)).toBe(phrase); expect(b.local.getItem(SESSION_KEY)).toBeNull();
  });
});

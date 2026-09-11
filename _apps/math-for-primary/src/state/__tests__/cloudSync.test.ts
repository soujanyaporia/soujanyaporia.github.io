import { describe, expect, it } from 'vitest';
import { CloudSync, pendingKey, rejectedKey } from '../cloudSync';
import { ApiError, NetworkError } from '../../school/api';
import { reduceEvent, type ProgressEvent } from '../../school/events';
import { initialProgress } from '../progress';
import type { KV } from '../../primary/sessionStore';

const memory = (): KV => { const data = new Map<string, string>(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }; };
/** The account API's progress rules: optimistic versions, duplicate IDs rejected per batch, stored IDs skipped. */
function fakeServer() {
  let version = 0, state = initialProgress(), offline = false, expired = false;
  const seen = new Set<string>();
  const api = async (path: string, method = 'GET', body?: any) => {
    if (offline) throw new NetworkError('offline');
    if (expired) throw new ApiError(401, 'Please sign in again.', {});
    if (path !== '/progress') throw new ApiError(404, 'Endpoint not found.', {});
    if (method === 'GET') return { version, progress: structuredClone(state) };
    if (body.version !== version) throw new ApiError(409, 'Progress updated on another device.', { version, progress: state });
    const ids = new Set<string>();
    for (const e of body.events) { if (ids.has(e.id)) throw new ApiError(400, 'Invalid event ID.', {}); ids.add(e.id); if (e.answer === 'invalid') throw new ApiError(400, 'Invalid primary answer.', {}); }
    for (const e of body.events) if (!seen.has(e.id)) { seen.add(e.id); state = reduceEvent(state, e); }
    version++;
    return { version, progress: structuredClone(state) };
  };
  return { api, get state() { return state; }, set offline(v: boolean) { offline = v; }, set expired(v: boolean) { expired = v; } };
}
const answer = (id: string, extra: object = {}): ProgressEvent => ({ id, at: 1000, kind: 'primary_answer', activityId: 'p1s-count-n0', correct: true, firstTry: true, hints: 0, tries: 1, ...extra }) as ProgressEvent;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('pupil progress upload', () => {
  it('queues an event once and the server counts it once', async () => {
    const server = fakeServer(), sync = new CloudSync('u1', server.api, memory(), () => {});
    for (let i = 0; i < 3; i++) sync.emit(answer(uuid(1)));
    expect(sync.queue).toHaveLength(1);
    expect(await sync.flush()).toBe(true);
    sync.emit(answer(uuid(1)));
    expect(await sync.flush()).toBe(true);
    expect(server.state.totals.attempted).toBe(1);
    expect(sync.progress.totals.attempted).toBe(1);
  });
  it('sets aside an event the server permanently rejects so later work still saves', async () => {
    const kv = memory(), server = fakeServer(), sync = new CloudSync('u1', server.api, kv, () => {});
    await sync.flush();
    sync.emit(answer(uuid(2), { answer: 'invalid' }));
    sync.emit(answer(uuid(3)));
    await sync.flush();
    expect(sync.queue).toHaveLength(0);
    expect(server.state.totals.attempted).toBe(1);
    expect(JSON.parse(kv.getItem(rejectedKey('u1'))!)).toHaveLength(1);
    expect(sync.info).toMatchObject({ state: 'saved', rejected: 1 });
  });
  it('replays waiting events on top of progress another device saved first', async () => {
    const server = fakeServer(), tabletKv = memory(), phone = new CloudSync('u1', server.api, memory(), () => {}), tablet = new CloudSync('u1', server.api, tabletKv, () => {});
    await tablet.flush();
    phone.emit(answer(uuid(4)));
    await phone.flush();
    tablet.emit(answer(uuid(5)));
    expect(await tablet.flush()).toBe(true);
    expect(server.state.totals.attempted).toBe(2);
    expect(tablet.progress.totals.attempted).toBe(2);
  });
  it('keeps work and a snapshot through an outage and a reload, then saves it', async () => {
    const kv = memory(), server = fakeServer();
    const first = new CloudSync('u1', server.api, kv, () => {});
    first.emit(answer(uuid(6)));
    await first.flush();
    server.offline = true;
    first.emit(answer(uuid(7)));
    expect(await first.flush()).toBe(false);
    expect(first.info.state).toBe('offline');
    const reloaded = new CloudSync('u1', server.api, kv, () => {});
    expect(reloaded.ready).toBe(true);
    expect(reloaded.queue.map((e) => e.id)).toEqual([uuid(7)]);
    expect(reloaded.progress.totals.attempted).toBe(2);
    server.offline = false;
    expect(await reloaded.flush()).toBe(true);
    expect(server.state.totals.attempted).toBe(2);
    expect(JSON.parse(kv.getItem(pendingKey('u1'))!)).toEqual([]);
  });
  it('keeps work pending when the sign-in has expired', async () => {
    const server = fakeServer(), sync = new CloudSync('u1', server.api, memory(), () => {});
    await sync.flush();
    server.expired = true;
    sync.emit(answer(uuid(8)));
    expect(await sync.flush()).toBe(false);
    expect(sync.info.state).toBe('expired');
    expect(sync.queue).toHaveLength(1);
  });
});

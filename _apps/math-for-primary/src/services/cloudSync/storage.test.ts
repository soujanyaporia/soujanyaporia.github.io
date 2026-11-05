import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialProgress } from '../../state/progress';
import { applyState, captureState } from './snapshot';
import { APPLIED_EVENT, browserKV, CHANGE_EVENT, clearGuestStorage, endSharedMode, isSharedDevice, LESSONS_KEY, MISSION_PREFIX, PAPER_KEY, PROGRESS_KEY, SESSIONS_KEY, startSharedMode } from './storage';
function storage(): Storage { const map = new Map<string, string>(); return { get length() { return map.size; }, key: i => [...map.keys()][i] ?? null, getItem: k => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: k => { map.delete(k); }, clear: () => map.clear() }; }
function setup() { const local = storage(), tab = storage(), target = new EventTarget(); vi.stubGlobal('localStorage', local); vi.stubGlobal('sessionStorage', tab); vi.stubGlobal('window', target); return { local, tab, target }; }
afterEach(() => vi.unstubAllGlobals());
describe('exact guest storage integration', () => {
  it('captures and restores activities, lessons, missions and a practice paper separately', () => {
    const { target } = setup(); const p = initialProgress(1); browserKV.setItem(PROGRESS_KEY, JSON.stringify(p));
    browserKV.setItem(SESSIONS_KEY, JSON.stringify({ entries: { fractions: { session: { updatedAt: 10, draft: { value: '1/3' } } } } }));
    browserKV.setItem(LESSONS_KEY, JSON.stringify({ attempts: { halves: { updatedAt: 12, stage: 3 } } }));
    browserKV.setItem(MISSION_PREFIX + 'sharing', JSON.stringify({ updatedAt: 15, round: 2 })); browserKV.setItem(PAPER_KEY, JSON.stringify({ code: 'paper', answers: ['5'], position: 0 }));
    const snapshot = captureState(); expect(Object.keys(snapshot.checkpoints).sort()).toEqual(['lesson:halves', 'mission:sharing', 'paper', 'session:fractions']); clearGuestStorage();
    let changes = 0, applied = 0; target.addEventListener(CHANGE_EVENT, () => changes++); target.addEventListener(APPLIED_EVENT, () => applied++); applyState(snapshot); expect(captureState()).toEqual(snapshot); expect(changes).toBe(0); expect(applied).toBe(1);
  });
  it('keeps shared progress and credentials tab-only and never wipes school-scoped data', () => {
    const { local, tab } = setup(); local.setItem(PROGRESS_KEY, 'old'); local.setItem(PROGRESS_KEY + ':student:123', 'school');
    startSharedMode(); expect(isSharedDevice()).toBe(true); expect(local.getItem(PROGRESS_KEY)).toBeNull(); browserKV.setItem(PROGRESS_KEY, 'shared work'); expect(tab.getItem(PROGRESS_KEY)).toBe('shared work'); expect(local.getItem(PROGRESS_KEY)).toBeNull();
    endSharedMode(); expect(isSharedDevice()).toBe(false); expect(tab.getItem(PROGRESS_KEY)).toBeNull(); expect(local.getItem(PROGRESS_KEY + ':student:123')).toBe('school');
  });
});

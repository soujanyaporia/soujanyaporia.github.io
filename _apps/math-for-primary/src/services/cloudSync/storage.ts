/** Small dependency-free boundary shared by all local repositories. */
export const SESSION_KEY = 'sg_maths_cloud_session_v1';
export const CHANGE_EVENT = 'sg-maths-local-change';
export const APPLIED_EVENT = 'sg-maths-cloud-applied';
export const PROGRESS_KEY = 'math-for-primary.progress.v2';
export const SESSIONS_KEY = 'math-for-primary.sessions.v1:guest';
export const LESSONS_KEY = 'math-for-primary.lessons.v1:guest';
export const PAPER_KEY = 'singapore-maths.practice-paper.v1:guest';
export const MISSION_PREFIX = 'math-for-primary.missions.v1:guest:';
const PAPER_TIME = 'sg_maths_paper_updated_v1';
const SHARED_MARKER = 'sg_maths_shared_v1';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function isGuestKey(key: string) { return [PROGRESS_KEY, 'math-for-primary.progress.v1', SESSIONS_KEY, LESSONS_KEY, PAPER_KEY, PAPER_TIME].includes(key) || key.startsWith(MISSION_PREFIX); }
export function isSharedDevice() { try { return sessionStorage.getItem(SHARED_MARKER) === '1'; } catch { return false; } }
export function guestStorage(): Storage { return isSharedDevice() ? sessionStorage : localStorage; }
let muted = 0;
export function withoutNotifications<T>(fn: () => T): T { muted++; try { return fn(); } finally { muted--; } }
export function notifyProgressChange(immediate = false) { if (!muted && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { immediate } })); }
export const browserKV: StorageLike = {
  getItem(key) { return (isGuestKey(key) ? guestStorage() : localStorage).getItem(key); },
  setItem(key, value) {
    const store = isGuestKey(key) ? guestStorage() : localStorage;
    if (store.getItem(key) === value) return;
    store.setItem(key, value);
    if (key === PAPER_KEY) store.setItem(PAPER_TIME, String(Date.now()));
    if (isGuestKey(key)) notifyProgressChange();
  },
  removeItem(key) { (isGuestKey(key) ? guestStorage() : localStorage).removeItem(key); if (isGuestKey(key)) notifyProgressChange(); },
};
export function paperUpdatedAt() { return Number(guestStorage().getItem(PAPER_TIME)) || 0; }
export function setPaperUpdatedAt(at: number) { guestStorage().setItem(PAPER_TIME, String(at)); }
export function clearGuestStorage(store: Storage = guestStorage()) {
  const keys = Array.from({ length: store.length }, (_, i) => store.key(i)!);
  for (const key of keys) if (isGuestKey(key)) store.removeItem(key);
}
export function startSharedMode() {
  // Snapshot is captured before this operation. Do not leave pupil data in durable storage.
  sessionStorage.setItem(SHARED_MARKER, '1'); clearGuestStorage(localStorage); localStorage.removeItem(SESSION_KEY);
}
export function endSharedMode() { clearGuestStorage(sessionStorage); sessionStorage.removeItem(SHARED_MARKER); }

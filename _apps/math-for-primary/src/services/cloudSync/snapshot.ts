import { initialProgress, sanitize } from '../../state/progress';
import { APPLIED_EVENT, browserKV, guestStorage, LESSONS_KEY, MISSION_PREFIX, PAPER_KEY, paperUpdatedAt, PROGRESS_KEY, SESSIONS_KEY, setPaperUpdatedAt, withoutNotifications } from './storage';
import { type CloudState, type Checkpoint } from './mergeProgress';
const read = (key: string): any => { try { return JSON.parse(browserKV.getItem(key) ?? 'null'); } catch { return null; } };
export function captureState(): CloudState {
  const checkpoints: Record<string, Checkpoint> = {};
  for (const [id, entry] of Object.entries<any>(read(SESSIONS_KEY)?.entries ?? {})) if (entry?.session) checkpoints[`session:${id}`] = { updatedAt: entry.session.updatedAt ?? 0, value: entry.session };
  for (const [id, attempt] of Object.entries<any>(read(LESSONS_KEY)?.attempts ?? {})) if (attempt) checkpoints[`lesson:${id}`] = { updatedAt: attempt.updatedAt ?? 0, value: attempt };
  const store = guestStorage();
  for (let i = 0; i < store.length; i++) { const key = store.key(i)!; if (key.startsWith(MISSION_PREFIX)) { const value = read(key); if (value) checkpoints[`mission:${key.slice(MISSION_PREFIX.length)}`] = { updatedAt: value.updatedAt ?? 0, value }; } }
  const paper = read(PAPER_KEY); if (paper) checkpoints.paper = { updatedAt: paperUpdatedAt(), value: paper };
  return { format: 1, progress: sanitize(read(PROGRESS_KEY) ?? read('math-for-primary.progress.v1')) ?? initialProgress(), checkpoints };
}
/** Existing readers validate generator-specific checkpoints before exposing them to the learner. */
export function applyState(state: CloudState) {
  withoutNotifications(() => {
    const sessions: Record<string, unknown> = {}, lessons: Record<string, unknown> = {};
    const store = guestStorage(), keys = Array.from({length: store.length}, (_, i) => store.key(i)!);
    for (const key of keys) if (key.startsWith(MISSION_PREFIX) && !state.checkpoints['mission:' + key.slice(MISSION_PREFIX.length)]) browserKV.removeItem(key);
    if (!state.checkpoints.paper) browserKV.removeItem(PAPER_KEY);
    for (const [key, c] of Object.entries(state.checkpoints)) {
      if (key.startsWith('session:')) sessions[key.slice(8)] = { session: c.value, rev: 0, dirty: false };
      else if (key.startsWith('lesson:')) lessons[key.slice(7)] = c.value;
      else if (key.startsWith('mission:')) browserKV.setItem(MISSION_PREFIX + key.slice(8), JSON.stringify(c.value));
      else if (key === 'paper') { browserKV.setItem(PAPER_KEY, JSON.stringify(c.value)); setPaperUpdatedAt(c.updatedAt); }
    }
    browserKV.setItem(SESSIONS_KEY, JSON.stringify({ scope: 'guest', entries: sessions }));
    browserKV.setItem(LESSONS_KEY, JSON.stringify({ v: 1, attempts: lessons }));
    // Write progress last, then notify React. A failed storage write is never reported as saved.
    browserKV.setItem(PROGRESS_KEY, JSON.stringify(state.progress));
  });
  window.dispatchEvent(new Event(APPLIED_EVENT));
}

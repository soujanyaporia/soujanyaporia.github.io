import { initialProgress, sanitize, type ProgressState } from '../../state/progress';
import { learningRewards } from '../../teach/rewards';
export interface Checkpoint { updatedAt: number; value: unknown }
export interface CloudState { format: 1; progress: ProgressState; checkpoints: Record<string, Checkpoint> }
export function stableJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(k => (value as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
const union = <T>(a: T[] = [], b: T[] = []): T[] => [...new Map([...a, ...b].map(x => [stableJson(x), x])).entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, v]) => v);
const chronological = <T extends {at:number}>(a: T[] = [], b: T[] = []): T[] => union(a,b).sort((x,y)=>x.at-y.at || (stableJson(x)<stableJson(y)?-1:stableJson(x)>stableJson(y)?1:0));
function latest<T>(a: T, b: T, at: number, bt: number): T { return at !== bt ? at > bt ? a : b : stableJson(a) >= stableJson(b) ? a : b; }
const earliest = (a: unknown, b: unknown) => Math.min(n(a) || Infinity, n(b) || Infinity) === Infinity ? 0 : Math.min(n(a) || Infinity, n(b) || Infinity);
/** Join monotone counters/sets. No sums of replicated aggregate counters. */
function join(a: any, b: any): any {
  if (a === undefined || a === null) return b; if (b === undefined || b === null) return a;
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  if (typeof a === 'boolean' && typeof b === 'boolean') return a || b;
  if (Array.isArray(a) && Array.isArray(b)) return union(a, b);
  if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) return mapJoin(a, b, join);
  return stableJson(a) >= stableJson(b) ? a : b;
}
function mapJoin<T>(a: Record<string, T>, b: Record<string, T>, merge: (a: T, b: T) => T): Record<string, T> {
  return Object.fromEntries(union(Object.keys(a), Object.keys(b)).map(k => [k, a[k] === undefined ? b[k] : b[k] === undefined ? a[k] : merge(a[k], b[k])]));
}
export function singaporeDay(at = Date.now()): string { return new Date(at + 8 * 3600000).toISOString().slice(0, 10); }
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86400000;
const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(dayNumber(day)) && new Date(dayNumber(day) * 86400000).toISOString().slice(0, 10) === day;
export function practiceDates(p: ProgressState): string[] {
  return union(p.practiceDates ?? [], [
    ...Object.values(p.primary.activities).flatMap(a => a.days ?? []),
    ...(p.primary.history ?? []).map(h => singaporeDay(h.at)), ...p.recent.map(h => singaporeDay(h.at)),
    ...Object.values(p.nodes).map(h => singaporeDay(h.lastAt)), ...(p.streak.lastDay ? [p.streak.lastDay] : []),
  ]).filter(validDay);
}
/** Preserve the app's free weekends and already consumed shields. Count active days, not skipped days. */
export function streakFromDates(dates: string[], shieldDays: string[], today = singaporeDay(), anchors: Record<string, number> = {}) {
  const active = new Set(dates.filter(d => validDay(d) && d <= today).map(dayNumber)), shield = new Set(shieldDays.map(dayNumber));
  const ordered = [...active].sort((a, b) => a - b); let run = 0, best = 0, previous: number | null = null;
  const bridge = (start: number, end: number) => { if (end - start > 370) return false; for (let day = start + 1; day < end; day++) { const weekday = new Date(day * 86400000).getUTCDay(); if (weekday !== 0 && weekday !== 6 && !shield.has(day)) return false; } return true; };
  for (const day of ordered) { run = previous !== null && bridge(previous, day) ? run + 1 : 1; run = Math.max(run, anchors[new Date(day * 86400000).toISOString().slice(0, 10)] ?? 0); best = Math.max(best, run); previous = day; }
  const current = previous !== null && bridge(previous, dayNumber(today)) ? run : 0;
  return { current, best, lastDay: ordered.length ? new Date(ordered[ordered.length - 1] * 86400000).toISOString().slice(0, 10) : null };
}
function preferences(p: ProgressState) { return { profile: p.profile, selection: p.primary.selection, equipped: p.equipped, settings: p.settings, profileUpdatedAt: p.profileUpdatedAt ?? 0 }; }
function custom(p: ProgressState) { return !['', 'guest', 'explorer'].includes(p.profile.name.trim().toLowerCase()) || Object.entries(p.equipped).some(([k, v]) => v !== initialProgress(0).equipped[k as keyof typeof p.equipped]); }
export function mergeProgress(a: ProgressState, b: ProgressState, today = singaporeDay()): ProgressState {
  // Preserve exact self-joins, including migrated snapshots with optional fields absent.
  if (stableJson(a) === stableJson(b)) return a;
  const chosen = custom(a) !== custom(b) ? custom(a) ? preferences(a) : preferences(b) : latest(preferences(a), preferences(b), a.profileUpdatedAt ?? 0, b.profileUpdatedAt ?? 0);
  const activities = mapJoin(a.primary.activities, b.primary.activities, (x, y) => ({ ...join(x, y), recent: latest(x.recent, y.recent, x.lastAt, y.lastAt), firstCompletedAt: earliest((x as any).firstCompletedAt, (y as any).firstCompletedAt) || undefined }));
  const nodes = mapJoin(a.nodes, b.nodes, (x, y) => ({ ...join(x, y), lastStars: x.lastAt === y.lastAt ? Math.max(x.lastStars, y.lastStars) : x.lastAt > y.lastAt ? x.lastStars : y.lastStars, firstCompletedAt: earliest(x.firstCompletedAt, y.firstCompletedAt) || undefined }));
  const dates = union(practiceDates(a), practiceDates(b));
  const anchors = (p: ProgressState) => p.streakAnchors ?? (p.streak.lastDay && p.streak.current > 0 ? { [p.streak.lastDay]: p.streak.current } : {});
  const streakAnchors = mapJoin(anchors(a), anchors(b), Math.max);
  const shields = union(a.streak.shieldDays, b.streak.shieldDays), streak = streakFromDates(dates, shields, today, streakAnchors);
  const result: ProgressState = {
    ...initialProgress(earliest(a.createdAt, b.createdAt)), version: 2, profile: chosen.profile, equipped: chosen.equipped, settings: chosen.settings, profileUpdatedAt: chosen.profileUpdatedAt,
    primary: { selection: chosen.selection, activities, history: chronological(a.primary.history, b.primary.history), applied: union(a.primary.applied, b.primary.applied) },
    nodes, skills: mapJoin(a.skills, b.skills, (x,y) => x && y ? {...join(x,y), recent:latest(x.recent,y.recent,x.lastSeen,y.lastSeen)} : x ?? y), badges: union(a.badges, b.badges), totals: join(a.totals, b.totals), counters: join(a.counters, b.counters),
    xp: Math.max(a.xp, b.xp), gems: Math.max(a.gems, b.gems), gemsEarned: Math.max(a.gemsEarned, b.gemsEarned),
    practiceDates: dates, streakAnchors, streak: { ...streak, best: Math.max(streak.best, a.streak.best, b.streak.best), freezes: Math.max(a.streak.freezes, b.streak.freezes), shieldDays: shields },
    achievements: mapJoin(a.achievements, b.achievements, (x, y) => earliest(x, y)), inventory: union(a.inventory, b.inventory),
    chests: Object.values(mapJoin(Object.fromEntries(a.chests.map(c => [c.id, c])), Object.fromEntries(b.chests.map(c => [c.id, c])), join)),
    quests: !a.quests ? b.quests : !b.quests ? a.quests : a.quests.day === b.quests.day ? { day: a.quests.day, bonusClaimed: a.quests.bonusClaimed || b.quests.bonusClaimed, quests: Object.values(mapJoin(Object.fromEntries(a.quests.quests.map(q => [q.id, q])), Object.fromEntries(b.quests.quests.map(q => [q.id, q])), join)) } : a.quests.day > b.quests.day ? a.quests : b.quests,
    recent: chronological(a.recent, b.recent), history: chronological(a.history, b.history),
  };
  result.totals.stars = Math.max(result.totals.stars, Object.values(nodes).reduce((sum, node) => sum + node.bestStars, 0) + Object.values(activities).reduce((sum, act) => sum + act.stars, 0));
  // Current UI derives rewards. Retain larger historical counters and unlocked cosmetics.
  const rewards = learningRewards(result); result.xp = Math.max(result.xp, rewards.xp); result.gems = Math.max(result.gems, rewards.gems); result.gemsEarned = Math.max(result.gemsEarned, result.gems);
  return result;
}
export function mergeCloudState(a: CloudState, b: CloudState): CloudState {
  const progress = mergeProgress(a.progress, b.progress);
  const checkpoints = mapJoin(a.checkpoints, b.checkpoints, (x, y) => latest(x, y, x.updatedAt, y.updatedAt));
  for (const [key, checkpoint] of Object.entries(checkpoints)) {
    const value = checkpoint.value as {completedAt?: number|null; finishedAt?: number|null};
    const completedAt = key.startsWith('lesson:') ? progress.nodes['learn.' + key.slice(7)]?.lastAt : key.startsWith('session:') ? progress.primary.activities[key.slice(8)]?.lastCompletedAt : key.startsWith('mission:') ? progress.nodes['mission.' + key.slice(8)]?.lastAt : undefined;
    // A newer replay survives. Old unfinished work cannot revive a completed run.
    if (completedAt && checkpoint.updatedAt <= completedAt && (value.completedAt === null || value.finishedAt === null)) delete checkpoints[key];
  }
  return { format: 1, progress, checkpoints };
}
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validateCloudState(value: unknown): CloudState {
  if (!object(value) || value.format !== 1 || !object(value.progress) || value.progress.version !== 2 || !object(value.checkpoints)) throw new Error('This is not a supported maths backup.');
  const p = value.progress;
  if (!object(p.primary) || !object(p.primary.activities) || !object(p.nodes) || !object(p.profile) || typeof p.profile.name !== 'string' || p.profile.name.length > 30 || !object(p.streak)) throw new Error('The progress in this backup is incomplete.');
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e15;
  if (!Object.values(p.primary.activities).every(a => object(a) && ['attempts', 'correct', 'firstTry', 'hints', 'tries', 'sessions', 'stars', 'lastAt'].every(k => finite(a[k])) && Array.isArray(a.days) && a.days.every((d: unknown) => typeof d === 'string') && Array.isArray(a.recent))) throw new Error('This backup has invalid activity records.');
  if (!Object.values(p.nodes).every(a => object(a) && ['completions', 'bestStars', 'lastStars', 'bestAccuracy', 'lastAt'].every(k => finite(a[k])))) throw new Error('This backup has invalid lesson records.');
  if (p.primary.selection !== null && (!object(p.primary.selection) || !Number.isInteger(p.primary.selection.level) || p.primary.selection.level < 1 || p.primary.selection.level > 6 || !['standard', 'foundation'].includes(p.primary.selection.track))) throw new Error('This backup has an invalid course.');
  if (p.practiceDates !== undefined && (!Array.isArray(p.practiceDates) || !p.practiceDates.every((d: unknown) => typeof d === 'string' && validDay(d)))) throw new Error('This backup has invalid practice dates.');
  if (!Array.isArray(p.streak.shieldDays) || !p.streak.shieldDays.every((d: unknown) => typeof d === 'string' && validDay(d))) throw new Error('This backup has invalid streak data.');
  for (const [key, c] of Object.entries(value.checkpoints)) if (!/^(session|lesson|mission):[-a-zA-Z0-9_.]+$/.test(key) && key !== 'paper' || !object(c) || !finite(c.updatedAt) || !object(c.value)) throw new Error('This backup has invalid unfinished work.');
  const progress = sanitize(p); if (!progress) throw new Error('This backup is not supported.');
  return { format: 1, progress, checkpoints: value.checkpoints };
}

import { describe, expect, it } from 'vitest';
import { initialProgress } from '../../state/progress';
import { mergeCloudState, mergeProgress, singaporeDay, streakFromDates, validateCloudState } from './mergeProgress';
const activity = (stars: number, at = 1) => ({ attempts: 10, correct: 8, firstTry: 7, hints: 2, tries: 12, sessions: 1, stars, lastAt: at, days: ['2026-11-04'], recent: [1, 0, 1] });
const make = (id: number) => {
  const p = initialProgress(id); p.primary.activities = { 'p3.fractions': activity(id, id) }; if (id === 2) p.primary.activities['p4.decimals'] = activity(1, id);
  p.nodes = { [`learn.p${id}.a`]: { completions: 1, bestStars: id, lastStars: id, bestAccuracy: 0.8, lastAt: id, firstCompletedAt: id } };
  p.xp = id * 500; p.gems = id * 70; p.gemsEarned = p.gems; p.inventory.push(`hat-${id}`); p.practiceDates = [`2026-11-0${id + 1}`]; p.profile = { name: id === 1 ? 'Guest' : 'Otter', onboarded: true }; p.profileUpdatedAt = id; p.primary.selection = { level: id, track: 'standard' };
  return p;
};
describe('lossless progress join', () => {
  it('unions activity IDs and retains best stars, completions and rewards', () => {
    const a = make(1), b = make(2); a.primary.activities['p3.fractions'].stars = 2; b.primary.activities['p3.fractions'].stars = 3;
    const p = mergeProgress(a, b); expect(p.primary.activities['p3.fractions'].stars).toBe(3); expect(p.primary.activities['p4.decimals'].stars).toBe(1); expect(p.xp).toBeGreaterThanOrEqual(b.xp); expect(p.gems).toBeGreaterThanOrEqual(b.gems); expect(p.inventory).toEqual(expect.arrayContaining(['hat-1', 'hat-2'])); expect(p.nodes).toHaveProperty('learn.p1.a'); expect(p.profile.name).toBe('Otter');
  });
  it('is idempotent, commutative and associative including preference ties', () => {
    const a = make(1), b = make(2), c = make(3); b.profileUpdatedAt = c.profileUpdatedAt = 7;
    expect(mergeProgress(a, a)).toEqual(a); expect(mergeProgress(a, b)).toEqual(mergeProgress(b, a));
    expect(mergeProgress(mergeProgress(a, b), c)).toEqual(mergeProgress(a, mergeProgress(b, c)));
    const merged = mergeProgress(a, b); expect(mergeProgress(merged, merged)).toEqual(merged); expect(mergeProgress(merged, a)).toEqual(merged);
  });
  it('retains newer checkpoints and deterministic ties including an active replay', () => {
    const a = { format: 1 as const, progress: make(1), checkpoints: { 'lesson:fractions': { updatedAt: 2, value: { stage: 3 } } } }, b = { format: 1 as const, progress: make(2), checkpoints: { 'lesson:fractions': { updatedAt: 3, value: { stage: 5 } }, paper: { updatedAt: 4, value: { position: 1 } } } };
    expect(mergeCloudState(a, b).checkpoints['lesson:fractions'].value).toEqual({ stage: 5 }); expect(mergeCloudState(a, b)).toEqual(mergeCloudState(b, a)); expect(mergeCloudState(a, b).checkpoints.paper).toEqual(b.checkpoints.paper);
  });
  it('recomputes Singapore streak dates, yesterday, weekends and shield days', () => {
    expect(singaporeDay(Date.parse('2026-11-04T16:01:00Z'))).toBe('2026-11-05');
    expect(streakFromDates(['2026-11-03', '2026-11-04'], [], '2026-11-05').current).toBe(2);
    expect(streakFromDates(['2026-10-30', '2026-11-02'], [], '2026-11-02').current).toBe(2);
    expect(streakFromDates(['2026-11-02', '2026-11-04'], ['2026-11-03'], '2026-11-05').current).toBe(2);
    expect(streakFromDates(['2026-11-01'], [], '2026-11-05').current).toBe(0);
  });
  it('keeps legacy streak counts when old practice dates are incomplete', () => { const a=initialProgress(1),b=initialProgress(2);a.streak={...a.streak,current:7,best:7,lastDay:'2026-11-04'}; const merged=mergeProgress(a,b,'2026-11-05');expect(merged.streak.current).toBe(7);expect(mergeProgress(merged,b,'2026-11-05')).toEqual(merged); });
  it('rejects malformed imported progress without touching state', () => { const state = { format: 1, progress: make(1), checkpoints: {} }; expect(validateCloudState(state).format).toBe(1); expect(() => validateCloudState({ ...state, progress: { ...state.progress, primary: { activities: { bad: {} } } } })).toThrow(); });
});

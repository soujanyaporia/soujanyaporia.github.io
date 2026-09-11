import type { Rng } from './random';
import { clampLevel, SKILLS } from './skills';
import type { LevelId, Misconception, SkillId } from './types';
import { bandIndex, DAY, masteryBand, masteryScore, type SkillStats, type StatsMap } from './stats';

/**
 * Adaptive learning policies.
 *
 * The skill statistics themselves (mastery bands, spaced-review scheduling,
 * `updateStats`) live in `stats.ts` so the saved-progress reducer does not
 * load the question generators; they are re-exported here unchanged.
 *
 * The AdaptivePolicy interface keeps room for smarter models later.
 */
export * from './stats';

/** Skills whose spaced review is due, oldest first. */
export function dueReviews(stats: StatsMap, now: number, limit = 10): SkillId[] {
  return (Object.entries(stats) as [SkillId, SkillStats][])
    .filter(([id, s]) => s.review && s.review.due <= now && id in SKILLS)
    .sort((a, b) => a[1].review!.due - b[1].review!.due)
    .slice(0, limit)
    .map(([id]) => id);
}

export interface AdaptivePolicy {
  /** Pick `count` skills (with repeats) for a mixed session. */
  chooseSkills(stats: StatsMap, pool: readonly SkillId[], count: number, rng: Rng, now: number): SkillId[];
  /** The level to practise a skill at. */
  levelFor(skill: SkillId, stats: StatsMap, fallback: LevelId): LevelId;
}

export function skillWeight(s: SkillStats | undefined, now: number): number {
  if (!s || s.attempts === 0) return 1.2;
  let weight = 0.25 + 2 * Math.pow(1 - masteryScore(s), 1.5);
  if (s.review && s.review.due <= now) weight += 1;
  else if (now - s.lastSeen > 2 * DAY) weight += 0.35;
  return weight;
}

export const simplePolicy: AdaptivePolicy = {
  chooseSkills(stats, pool, count, rng, now) {
    if (pool.length === 0) return [];
    const cap = Math.max(2, Math.ceil(count * 0.4));
    const picks: SkillId[] = [];
    const used = new Map<SkillId, number>();
    for (let i = 0; i < count; i++) {
      const options = pool.filter((id) => (used.get(id) ?? 0) < cap).map((id) => [id, skillWeight(stats[id], now)] as const);
      const id = options.length ? rng.weighted(options) : rng.pick(pool);
      picks.push(id);
      used.set(id, (used.get(id) ?? 0) + 1);
    }
    return picks;
  },
  levelFor(skill, stats, fallback) {
    return clampLevel(skill, stats[skill]?.level ?? fallback);
  },
};

/** Skills that most need practice (for the "Let's practise" chips). */
export function focusSkills(stats: StatsMap, limit = 3): SkillId[] {
  return (Object.entries(stats) as [SkillId, SkillStats][])
    .filter(([id, s]) => s.attempts >= 3 && bandIndex(masteryBand(s)) <= bandIndex('practising') && id in SKILLS)
    .sort((a, b) => masteryScore(a[1]) - masteryScore(b[1]))
    .slice(0, limit)
    .map(([id]) => id);
}

/** Skills going well (for the "Going well" chips). */
export function strongSkills(stats: StatsMap, limit = 3): SkillId[] {
  return (Object.entries(stats) as [SkillId, SkillStats][])
    .filter(([id, s]) => bandIndex(masteryBand(s)) >= bandIndex('almost') && id in SKILLS)
    .sort((a, b) => masteryScore(b[1]) - masteryScore(a[1]))
    .slice(0, limit)
    .map(([id]) => id);
}

/** The misconception a skill shows most often (for grown-ups). */
export function topMisconception(s: SkillStats | undefined): Misconception | null {
  if (!s) return null;
  const entries = Object.entries(s.misconceptions ?? {}) as [Misconception, number][];
  const best = entries.filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

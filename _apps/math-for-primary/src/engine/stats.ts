import type { LevelId, Misconception, SkillId } from './types';

/**
 * Skill statistics used by the saved-progress reducer.
 *
 * This module deliberately has no dependency on the question generators, so
 * the progress reducer (and the app shell that loads it) stays small. The
 * adaptive policies in `adaptive.ts` re-export everything here.
 *
 * Mastery is not a count of questions. It combines a long-run average of
 * how well questions went (first try, hints, revealed answers), recent
 * performance, practice spread over different days, and success with
 * different representations (equations, stories, pictures).
 *
 * Spaced review: once a skill is getting stronger it is scheduled to come
 * back after 1, 3, 7, 14 and 30 days. A shaky review brings it back sooner.
 */

export interface SkillStats {
  attempts: number;
  /** Eventually answered correctly without the solution being revealed. */
  correct: number;
  firstTry: number;
  hints: number;
  /** Total submissions (for "average attempts"). */
  tries: number;
  reveals: number;
  /** Long-run average, 0..1. */
  mastery: number;
  level: LevelId;
  /** Consecutive first-try, no-hint answers at the working level. */
  streak: number;
  /** Questions answered since the working level last changed. */
  sinceLevelChange: number;
  lastSeen: number;
  /** Scores of the last few questions (0..1). */
  recent: number[];
  /** Days with at least one successful answer (YYYY-MM-DD, most recent last). */
  days: string[];
  /** Representations answered cleanly: 'equation', 'story', 'groups' … */
  formats: string[];
  misconceptions: Partial<Record<Misconception, number>>;
  review: { due: number; interval: number } | null;
}

export interface AttemptOutcome {
  skill: SkillId;
  level: LevelId;
  firstTry: boolean;
  /** Eventually correct without the answer being revealed. */
  correct: boolean;
  tries: number;
  hints: number;
  revealed: boolean;
  at: number;
  /** How the question was shown (for representation variety). */
  format?: string;
  /** The first mistake the child made, if any. */
  misconception?: Misconception;
}

export type StatsMap = Partial<Record<SkillId, SkillStats>>;

const PRIOR_MASTERY = 0.3;
export const DAY = 24 * 60 * 60 * 1000;
const INTERVALS = [1, 3, 7, 14, 30];

/**
 * Every skill currently spans working levels 1–5 (asserted in the engine
 * tests against `clampLevel`). Keeping the bound here avoids importing the
 * generator registry into the progress reducer.
 */
const clampSkillLevel = (level: number) => Math.min(5, Math.max(1, level)) as LevelId;

export function emptyStats(level: LevelId): SkillStats {
  return {
    attempts: 0,
    correct: 0,
    firstTry: 0,
    hints: 0,
    tries: 0,
    reveals: 0,
    mastery: PRIOR_MASTERY,
    level,
    streak: 0,
    sinceLevelChange: 0,
    lastSeen: 0,
    recent: [],
    days: [],
    formats: [],
    misconceptions: {},
    review: null,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
export function dayKey(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** How well a single question went, from 0 to 1. */
export function outcomeScore(o: AttemptOutcome): number {
  if (o.revealed) return 0;
  if (o.firstTry && o.hints === 0) return 1;
  if (o.hints === 0) return 0.6;
  return o.hints === 1 ? 0.45 : 0.3;
}

const average = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** 0..1, blending the long-run average with recent answers. */
export function masteryScore(s: SkillStats): number {
  const recent = s.recent?.length ? average(s.recent) : s.mastery;
  const variety = Math.min(0.06, Math.max(0, (s.formats?.length ?? 0) - 1) * 0.03);
  return Math.min(1, 0.55 * s.mastery + 0.45 * recent + variety);
}

export type MasteryBand = 'new' | 'learning' | 'practising' | 'stronger' | 'almost' | 'mastered';

export const BAND_ORDER: MasteryBand[] = ['new', 'learning', 'practising', 'stronger', 'almost', 'mastered'];

export const BAND_LABEL: Record<MasteryBand, string> = {
  new: 'Not started',
  learning: 'Learning',
  practising: 'Practising',
  stronger: 'Getting stronger',
  almost: 'Almost mastered',
  mastered: 'Mastered',
};

export function masteryBand(s: SkillStats | undefined): MasteryBand {
  if (!s || s.attempts === 0) return 'new';
  const score = masteryScore(s);
  const spread = (s.days?.length ?? 0) >= 2;
  if (score >= 0.88 && s.attempts >= 8 && spread && (s.recent?.length ?? 0) >= 5) return 'mastered';
  if (score >= 0.75) return 'almost';
  if (score >= 0.6) return 'stronger';
  if (score >= 0.4) return 'practising';
  return 'learning';
}

export const bandIndex = (band: MasteryBand) => BAND_ORDER.indexOf(band);

function nextInterval(current: number): number {
  return INTERVALS.find((i) => i > current) ?? INTERVALS[INTERVALS.length - 1];
}

export function updateStats(prev: SkillStats | undefined, o: AttemptOutcome): SkillStats {
  const s: SkillStats = { ...emptyStats(o.level), ...prev };
  const score = outcomeScore(o);
  const alpha = s.attempts < 6 ? 0.3 : 0.2;
  const clean = o.firstTry && o.hints === 0 && !o.revealed;
  const success = o.correct && !o.revealed;
  const day = dayKey(o.at);
  const next: SkillStats = {
    ...s,
    attempts: s.attempts + 1,
    correct: s.correct + (o.correct ? 1 : 0),
    firstTry: s.firstTry + (o.firstTry ? 1 : 0),
    hints: s.hints + o.hints,
    tries: s.tries + o.tries,
    reveals: s.reveals + (o.revealed ? 1 : 0),
    mastery: s.mastery + alpha * (score - s.mastery),
    streak: o.level === s.level ? (clean ? s.streak + 1 : 0) : s.streak,
    sinceLevelChange: s.sinceLevelChange + (o.level === s.level ? 1 : 0),
    lastSeen: o.at,
    recent: [...s.recent, score].slice(-8),
    days: success && !s.days.includes(day) ? [...s.days, day].slice(-6) : s.days,
    formats: clean && o.format && !s.formats.includes(o.format) ? [...s.formats, o.format].slice(-6) : s.formats,
    misconceptions: o.misconception ? { ...s.misconceptions, [o.misconception]: (s.misconceptions[o.misconception] ?? 0) + 1 } : s.misconceptions,
  };

  // Spaced review.
  if (s.review && o.at >= s.review.due) {
    const interval = clean ? nextInterval(s.review.interval) : 1;
    next.review = { interval, due: o.at + interval * DAY };
  } else if (s.review && !success) {
    next.review = { interval: 1, due: o.at + DAY };
  } else if (!s.review && bandIndex(masteryBand(next)) >= bandIndex('stronger')) {
    next.review = { interval: 1, due: o.at + DAY };
  }

  // Move the working level.
  if (o.level === s.level) {
    if (next.streak >= 5 && next.mastery >= 0.8) {
      const up = clampSkillLevel(s.level + 1);
      if (up !== s.level) return { ...next, level: up, streak: 0, sinceLevelChange: 0, mastery: Math.min(next.mastery, 0.7) };
    }
    if (next.sinceLevelChange >= 6 && next.mastery < 0.35) {
      const down = clampSkillLevel(s.level - 1);
      if (down !== s.level) return { ...next, level: down, streak: 0, sinceLevelChange: 0, mastery: 0.45 };
    }
  }
  return next;
}

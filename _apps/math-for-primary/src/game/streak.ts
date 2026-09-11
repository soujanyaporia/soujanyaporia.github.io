import { DAY, dayKey } from '../engine/adaptive';

/**
 * Daily streaks that encourage a habit without punishing children:
 *   - weekends are free: missing Saturday or Sunday never breaks a streak;
 *   - a streak shield (bought with gems) covers a missed school day;
 *   - a broken streak simply starts again with a warm welcome back.
 */
export interface StreakState {
  current: number;
  best: number;
  lastDay: string | null;
  /** Shields owned (max 2). */
  freezes: number;
  /** Days a shield was used on (for the calendar). */
  shieldDays: string[];
}

export const MAX_FREEZES = 2;
export const FREEZE_PRICE = 25;

export const STREAK_MILESTONES: { days: number; gems: number }[] = [
  { days: 3, gems: 5 },
  { days: 7, gems: 10 },
  { days: 14, gems: 20 },
  { days: 30, gems: 40 },
  { days: 50, gems: 60 },
  { days: 100, gems: 100 },
];

export const emptyStreak = (): StreakState => ({ current: 0, best: 0, lastDay: null, freezes: 0, shieldDays: [] });

export type StreakEvent = 'same-day' | 'started' | 'continued' | 'shielded' | 'restarted';

export interface StreakUpdate {
  streak: StreakState;
  event: StreakEvent;
  /** A milestone reached today, if any. */
  milestone?: { days: number; gems: number };
}

function parseDay(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

export function touchStreak(s: StreakState, at: number): StreakUpdate {
  const today = dayKey(at);
  if (s.lastDay === today) return { streak: s, event: 'same-day' };
  if (!s.lastDay) {
    const streak = { ...s, current: 1, best: Math.max(s.best, 1), lastDay: today };
    return { streak, event: 'started' };
  }
  // Days missed between the last active day and today.
  const missed: string[] = [];
  for (let t = parseDay(s.lastDay) + DAY; dayKey(t) !== today && t < at + DAY; t += DAY) missed.push(dayKey(t));
  let freezes = s.freezes;
  const shieldDays = [...s.shieldDays];
  let broken = false;
  for (const day of missed) {
    const weekday = new Date(parseDay(day)).getDay();
    if (weekday === 0 || weekday === 6) continue;
    if (freezes > 0) {
      freezes--;
      shieldDays.push(day);
    } else {
      broken = true;
      break;
    }
  }
  if (broken) {
    return { streak: { ...s, current: 1, lastDay: today, shieldDays: shieldDays.slice(-10) }, event: 'restarted' };
  }
  const current = s.current + 1;
  const milestone = STREAK_MILESTONES.find((m) => m.days === current);
  return {
    streak: { current, best: Math.max(s.best, current), lastDay: today, freezes, shieldDays: shieldDays.slice(-10) },
    event: freezes < s.freezes ? 'shielded' : 'continued',
    milestone,
  };
}

/** Is the streak still alive today (without practising yet)? */
export function streakAlive(s: StreakState, now: number): boolean {
  if (!s.lastDay) return false;
  return touchStreak(s, now).event !== 'restarted';
}

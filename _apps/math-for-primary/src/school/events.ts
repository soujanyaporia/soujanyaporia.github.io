import { applyAttempt, applySessionComplete, type ProgressState, type Settings } from '../state/progress';
import type { AttemptOutcome } from '../engine/adaptive';
import { newBadges } from '../content/badges';
export type ProgressEvent = { id: string; at: number } & (
  { kind: 'attempt'; outcome: AttemptOutcome } | { kind: 'session'; stars: number; lessonId?: string } | { kind: 'settings'; patch: Partial<Settings> }
);
export function reduceEvent(state: ProgressState, e: ProgressEvent): ProgressState {
  if (e.kind === 'attempt') return applyAttempt(state, e.outcome);
  if (e.kind === 'settings') return { ...state, settings: { ...state.settings, ...e.patch } };
  const next = applySessionComplete(state, e.stars, e.lessonId, e.at);
  return { ...next, badges: [...next.badges, ...newBadges(next).map(b=>b.id)] };
}

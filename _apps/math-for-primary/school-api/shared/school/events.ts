import {touchStreak} from '../game/streak';
import {applyPrimary,initialPrimary,type PrimaryEvent} from '../primary/progress';
import { applyAttempt, applySessionComplete, type ProgressState, type Settings } from '../state/progress';
import type { AttemptOutcome } from '../engine/adaptive';
import { newBadges } from '../content/badges';
export type ProgressEvent = PrimaryEvent | ({ id: string; at: number } & (
  { kind: 'attempt'; outcome: AttemptOutcome } | { kind: 'session'; stars: number; lessonId?: string } | { kind: 'settings'; patch: Partial<Settings> }
));
export function reduceEvent(state: ProgressState, e: ProgressEvent): ProgressState {
  if (e.kind === 'primary_selection' || e.kind === 'primary_answer' || e.kind === 'primary_complete') {
    const totals={...state.totals};
    if(e.kind==='primary_answer'){totals.attempted++;totals.correct+=Number(e.correct);totals.firstTry+=Number(e.firstTry);totals.hints+=e.hints;totals.tries+=e.tries;}
    if(e.kind==='primary_complete'){totals.sessions++;totals.stars+=e.stars;}
    const next={...state,totals,streak:e.kind==='primary_answer'?touchStreak(state.streak,e.at).streak:state.streak,primary:applyPrimary(state.primary??initialPrimary(),e)};
    return e.kind==='primary_complete'?{...next,badges:[...next.badges,...newBadges(next).map(b=>b.id)]}:next;
  }
  if (e.kind === 'attempt') return applyAttempt(state, e.outcome);
  if (e.kind === 'settings') return { ...state, settings: { ...state.settings, ...e.patch } };
  const next = applySessionComplete(state, e.stars, e.lessonId, e.at);
  return { ...next, badges: [...next.badges, ...newBadges(next).map(b=>b.id)] };
}

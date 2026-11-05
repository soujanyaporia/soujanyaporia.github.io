import {touchStreak} from '../game/streak';
import {alreadyCounted,applyPrimary,initialPrimary,type PrimaryEvent} from '../primary/progress';
import { applyAttempt, applySessionComplete, type ProgressState, type Settings } from '../state/progress';
import type { AttemptOutcome } from '../engine/stats';
import { newBadges } from '../content/badges';
export type ProgressEvent = PrimaryEvent | ({ id: string; at: number } & (
  { kind: 'attempt'; outcome: AttemptOutcome } | { kind: 'session'; stars: number; lessonId?: string } | { kind: 'settings'; patch: Partial<Settings> }
));
function reduceEventBase(state: ProgressState, e: ProgressEvent): ProgressState {
  if (e.kind === 'primary_selection' || e.kind === 'primary_answer' || e.kind === 'primary_complete') {
    // A repeated answer or completion (retry, refresh, second tab or device) changes nothing.
    if (alreadyCounted(state.primary, e)) return state;
    const totals={...state.totals};
    if(e.kind==='primary_answer'){totals.attempted++;totals.correct+=Number(e.correct);totals.firstTry+=Number(e.firstTry);totals.hints+=e.hints;totals.tries+=e.tries;}
    if(e.kind==='primary_complete'){totals.sessions++;totals.stars+=e.stars;}
    const next={...state,totals,streak:e.kind==='primary_answer'?touchStreak(state.streak,e.at).streak:state.streak,primary:applyPrimary(state.primary??initialPrimary(),e)};
    return e.kind==='primary_complete'?{...next,badges:[...next.badges,...newBadges(next).map(b=>b.id)]}:next;
  }
  // Lesson/mission completions and legacy answers are retried by offline sync too.
  if (e.kind !== 'settings' && state.primary?.applied?.includes(e.id)) return state;
  const remember = (next:ProgressState):ProgressState => ({...next,primary:{...(next.primary??initialPrimary()),applied:[...(next.primary?.applied??[]),e.id].slice(-400)}});
  if (e.kind === 'attempt') return remember(applyAttempt(state, e.outcome));
  if (e.kind === 'settings') return { ...state, settings: { ...state.settings, ...e.patch } };
  const completed = applySessionComplete(state, e.stars, e.lessonId, e.at);
  const next = remember(e.lessonId?.startsWith('mission.')?{...completed,streak:touchStreak(completed.streak,e.at).streak}:completed);
  return { ...next, badges: [...next.badges, ...newBadges(next).map(b=>b.id)] };
}

export function reduceEvent(state:ProgressState,e:ProgressEvent):ProgressState {
 const next=reduceEventBase(state,e);if(next===state)return state;
 if(e.kind==='settings'||e.kind==='primary_selection')return {...next,profileUpdatedAt:e.at};
 const day=new Date(e.at+8*3600000).toISOString().slice(0,10);
 return {...next,practiceDates:Array.from(new Set([...(next.practiceDates??[]),day])).sort()};
}

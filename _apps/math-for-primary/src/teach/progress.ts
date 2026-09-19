import { stableId } from '../primary/session';
import type { ProgressState } from '../state/progress';
import type { KV } from '../primary/sessionStore';
import type { Facet,Lesson,Stage } from './model';
/**
 * Lesson attempts are kept per scope in this browser so a lesson resumes at the same step. What counts
 * is recorded as progress events the account API already accepts: each checked answer is a primary
 * answer against the lesson's practice activity, and finishing a lesson is a session event with
 * lessonId `learn.<id>` (stars from the mastery check). Event IDs derive from the attempt, so a retry,
 * refresh or second tab cannot record the same answer or completion twice.
 */
export interface ItemRecord {answer:string;correct:boolean;firstTry:boolean;hints:number;tries:number;at:number}
/** Unfinished work is evidence too. Moving between questions must not clear mistakes or help. */
export interface ItemWork {value:string;tries:number;hints:number;teach:number;other:number|null;usedRecovery:boolean;showTool:boolean;wrong:string|null}
export function freshItemWork(showTool:boolean):ItemWork{return {value:'',tries:0,hints:0,teach:0,other:null,usedRecovery:false,showTool,wrong:null};}
export function mergeItemWork(previous:ItemWork|undefined,next:ItemWork):ItemWork{
 return {...next,tries:Math.max(previous?.tries??0,next.tries),hints:Math.max(previous?.hints??0,next.hints),teach:Math.max(previous?.teach??0,next.teach),usedRecovery:!!previous?.usedRecovery||next.usedRecovery};
}
export type LessonMode='learn'|'challenge'|'review';
export interface LessonAttempt {revision?:string;v:1;lessonId:string;attemptId:string;seed:number;mode:LessonMode;stage:number;items:Record<string,ItemRecord>;work?:Record<string,ItemWork>;done:Record<string,boolean>;readinessMissed:boolean;confidence:number|null;startedAt:number;updatedAt:number;completedAt:number|null;stars:number|null}
const PREFIX='math-for-primary.lessons.v1:';
export const nodeId=(lesson:Pick<Lesson,'id'>)=>`learn.${lesson.id}`;
export const reviewNodeId=(lesson:Pick<Lesson,'id'>)=>`learn.${lesson.id}.review`;
export const answerEventId=(attemptId:string,stage:number,key:string)=>stableId(`learn-answer|${attemptId}|${stage}|${key}`);
export const completeEventId=(attemptId:string)=>stableId(`learn-complete|${attemptId}`);
export const questionKey=(lesson:Pick<Lesson,'id'>,stage:number,key:string)=>`learn:${lesson.id}:${stage}:${key}`;
export function readAttempts(kv:KV|null,scope:string):Record<string,LessonAttempt>{try{const data=JSON.parse(kv?.getItem(PREFIX+scope)||'null');return data&&typeof data==='object'&&data.v===1?data.attempts:{};}catch{return {};}}
export function writeAttempt(kv:KV|null,scope:string,attempt:LessonAttempt){try{if(!kv)return;const attempts={...readAttempts(kv,scope),[attempt.lessonId]:attempt};const keep=Object.fromEntries(Object.entries(attempts).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0,40));kv.setItem(PREFIX+scope,JSON.stringify({v:1,attempts:keep}));}catch{/* storage unavailable: the lesson still works */}}
export function clearAttempts(kv:KV|null,scope:string){try{kv?.removeItem(PREFIX+scope);}catch{/* ignore */}}
/**
 * Mastery needs success across representations and question types. Three stars: every facet correct
 * on the first attempt without help. Two stars: at least 60% correct. One star otherwise.
 */
export function masteryStars(results:{facet:Facet;correct:boolean;firstTry:boolean}[]){
 if(!results.length)return 1;const correct=results.filter(r=>r.correct).length,clean=results.filter(r=>r.correct&&r.firstTry).length;
 return clean===results.length?3:correct/results.length>=.6?2:1;
}
export type LessonState='new'|'started'|'learned'|'mastered';
export function lessonState(progress:ProgressState,lesson:Pick<Lesson,'id'>,attempt?:LessonAttempt):LessonState{
 const n=progress.nodes?.[nodeId(lesson)];if(n?.bestStars>=3)return 'mastered';if(n?.completions)return 'learned';
 return attempt&&attempt.completedAt===null&&(attempt.stage>0||Object.keys(attempt.items).length>0)?'started':'new';
}
/** Spaced retrieval: after a lesson, quick reviews fall due after 1, 4, 10 and then 30 days. */
const INTERVALS=[1,4,10,30],DAY=86400000;
export function reviewDue(progress:ProgressState,lesson:Pick<Lesson,'id'>,now=Date.now()){
 const learned=progress.nodes?.[nodeId(lesson)],review=progress.nodes?.[reviewNodeId(lesson)];if(!learned?.completions)return {due:false,at:null as number|null};
 const done=review?.completions??0,last=Math.max(learned.lastAt||0,review?.lastAt||0);
 const latest=review&&(review.lastAt||0)>=(learned.lastAt||0)?review:learned;
 const days=latest.lastStars<3?1:INTERVALS[Math.min(done,INTERVALS.length-1)],at=last+days*DAY;
 return {due:now>=at,at};
}
/** A short mixed review drawn from the lesson's own mastery facets, in a new order and with new numbers. */
export function reviewStages(lesson:Lesson):Stage[]{
 const mastery=lesson.stages.find((s):s is Extract<Stage,{kind:'mastery'}>=>s.kind==='mastery');if(!mastery)return [];
 const pick=['word','missing','visual','reasoning','unfamiliar','direct','reverse'] as Facet[];
 const gens=pick.map(f=>mastery.gens.find(g=>g.facet===f)).filter((g):g is {facet:Facet;gen:any}=>!!g).slice(0,4);
 return [{kind:'mastery',title:'Quick review',text:'A few questions to keep this idea fresh. They mix the ways you learned it.',gens}];
}

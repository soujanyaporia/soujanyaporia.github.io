import type { Track } from '../school/curriculum';
export interface ActivityProgress {attempts:number;correct:number;firstTry:number;hints:number;tries:number;sessions:number;stars:number;lastAt:number;days:string[];recent:number[]}
export interface PrimaryProgress {selection:{level:number;track:Track}|null;activities:Record<string,ActivityProgress>;history?:{activityId:string;at:number;questionKey?:string;answer?:string;correct:boolean;firstTry:boolean;hints:number}[]}
export const initialPrimary=():PrimaryProgress=>({selection:null,activities:{},history:[]});
export type PrimaryEvent = {id:string;at:number} & (
 {kind:'primary_selection';level:number;track:Track} |
 {kind:'primary_answer';activityId:string;questionKey?:string;answer?:string;correct:boolean;firstTry:boolean;hints:number;tries:number} |
 {kind:'primary_complete';activityId:string;stars:number}
);
export function applyPrimary(state:PrimaryProgress,event:PrimaryEvent):PrimaryProgress{
 if(event.kind==='primary_selection')return {...state,selection:{level:event.level,track:event.level<5?'standard':event.track}};
 const prev=state.activities[event.activityId]||{attempts:0,correct:0,firstTry:0,hints:0,tries:0,sessions:0,stars:0,lastAt:0,days:[],recent:[]};
 const day=new Date(event.at).toISOString().slice(0,10);
 const next=event.kind==='primary_answer'?{...prev,attempts:prev.attempts+1,correct:prev.correct+Number(event.correct),firstTry:prev.firstTry+Number(event.firstTry),hints:prev.hints+event.hints,tries:prev.tries+event.tries,lastAt:event.at,days:Array.from(new Set([...prev.days,day])).slice(-30),recent:[...prev.recent,event.firstTry?1:0].slice(-16)}:{...prev,sessions:prev.sessions+1,stars:Math.max(prev.stars,event.stars),lastAt:event.at};
 return {...state,activities:{...state.activities,[event.activityId]:next},history:event.kind==='primary_answer'?[...(state.history||[]),{activityId:event.activityId,at:event.at,questionKey:event.questionKey,answer:event.answer,correct:event.correct,firstTry:event.firstTry,hints:event.hints}].slice(-100):state.history||[]};
}
export function activityBand(s:ActivityProgress|undefined){if(!s?.attempts)return 'Not started';if(s.attempts>=8&&s.firstTry/s.attempts>=.85)return 'Going well';return 'Keep exploring';}

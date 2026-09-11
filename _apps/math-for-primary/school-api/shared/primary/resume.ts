import { combineSessions,isUnfinished,parseQuestionKey,starsFor,type PrimarySession,type ScoredResult } from './session';
import type { PrimaryProgress } from './progress';
/**
 * Rebuild practice sessions from saved answer history. Every scored answer carries its session,
 * position, question count, generator version and question fingerprint in its question key, so a
 * second device can continue from the first unanswered question using data the account API already
 * stores. Drafts, and sessions with no scored answer yet, need the session store (this device, or the
 * sessions API when available). Only contiguous history from the first question is trusted.
 */
export function sessionsFromHistory(history:PrimaryProgress['history']):PrimarySession[]{
 const groups=new Map<string,{activityId:string;seed:number;count:number;generator:string;entries:Map<number,{result:ScoredResult;fingerprint:string}>}>();
 for(const h of history??[]){const k=h.questionKey?parseQuestionKey(h.questionKey):null;if(!k?.session||k.session.mode!=='practice'||k.activityId!==h.activityId)continue;
  const g=groups.get(k.session.id)??{activityId:k.activityId,seed:k.seed,count:k.session.count,generator:k.session.generator,entries:new Map()};
  if(g.activityId!==k.activityId||g.count!==k.session.count||g.generator!==k.session.generator||g.seed!==k.seed)continue;
  if(!g.entries.has(k.session.position))g.entries.set(k.session.position,{fingerprint:k.session.fingerprint,result:{answer:h.answer??'',correct:h.correct,firstTry:h.firstTry,hints:h.hints,tries:1,wrong:[],at:h.at}});
  groups.set(k.session.id,g);}
 const sessions:PrimarySession[]=[];
 for(const [id,g] of groups){const positions=[...g.entries.keys()].sort((a,b)=>a-b);if(positions.some((p,i)=>p!==i))continue;
  const results=positions.map(p=>g.entries.get(p)!.result),done=results.length>=g.count,last=Math.max(...results.map(r=>r.at));
  sessions.push({schema:1,id,activityId:g.activityId,generator:g.generator,seed:g.seed,count:g.count,fingerprints:Array.from({length:g.count},(_,i)=>g.entries.get(i)?.fingerprint??''),mode:'practice',repairOf:null,repair:[],cursor:results.length,results,draft:null,startedAt:Math.min(...results.map(r=>r.at)),updatedAt:last,completedAt:done?last:null,stars:done?starsFor(results):null});}
 return sessions;
}
/** The newest session per activity: device copies merge first, then saved answer history decides scores. */
export function combineAll(local:PrimarySession[],history:PrimarySession[],remote:PrimarySession[]=[]):Record<string,PrimarySession>{
 const out:Record<string,PrimarySession>={};
 for(const s of [...local,...remote])out[s.activityId]=combineSessions(out[s.activityId],s)!;
 for(const s of history)out[s.activityId]=combineSessions(out[s.activityId],s,true)!;
 return out;
}
export const unfinishedSessions=(all:Record<string,PrimarySession>)=>Object.values(all).filter(isUnfinished).sort((a,b)=>b.updatedAt-a.updatedAt);

import {describe,it,expect} from 'vitest';
import {activityById} from './catalog';
import type {Question} from './generate';
import {checkSession,createSession} from './sessionQuestions';
import {answerEventId,completeEventId,encodeQuestionKey,resumePosition,starsFor,type PrimarySession,type ScoredResult} from './session';
import {combineAll,sessionsFromHistory,unfinishedSessions} from './resume';
import {readSessions,storageKey,writeSessions,type KV} from './sessionStore';
import {reduceEvent,type ProgressEvent} from '../school/events';
import {initialProgress,sanitize,type ProgressState} from '../state/progress';
const memory=():KV=>{const data=new Map<string,string>();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>void data.set(k,v),removeItem:k=>void data.delete(k)};};
const T=Date.now()-60000;
/** Score one question the way the activity player does: update the session, then emit deterministic events. */
function answer(s:PrimarySession,questions:Question[],firstTry=true):{session:PrimarySession;events:ProgressEvent[]}{
 const p=s.results.length,at=T+1000+p,r:ScoredResult={answer:questions[p].answer,correct:true,firstTry,hints:firstTry?0:1,tries:firstTry?1:2,wrong:firstTry?[]:['0'],at};
 const results=[...s.results,r],done=results.length===s.count,stars=done?starsFor(results):null;
 const events:ProgressEvent[]=[{id:answerEventId(s.id,p),at,kind:'primary_answer',activityId:s.activityId,questionKey:encodeQuestionKey(s,p,questions[p].key),answer:r.answer,correct:r.correct,firstTry:r.firstTry,hints:r.hints,tries:r.tries,sessionId:s.id,position:p}];
 if(done)events.push({id:completeEventId(s.id),at,kind:'primary_complete',activityId:s.activityId,stars:stars!,sessionId:s.id});
 return {session:{...s,results,draft:null,cursor:p,updatedAt:at,completedAt:done?at:null,stars},events};
}
const apply=(state:ProgressState,events:ProgressEvent[])=>events.reduce(reduceEvent,state);
describe('resuming an unfinished activity',()=>{
 const a=activityById('p3s-fractionEquivalent-n9')!;
 it('restores the exact question and working after a reload without scoring the draft',()=>{
  const kv=memory();let {session,questions}=createSession(a,{seed:123,now:T}),progress=initialProgress();
  for(let i=0;i<2;i++){const r=answer(session,questions);session={...r.session,cursor:i+1};progress=apply(progress,r.events);}
  session={...session,draft:{position:2,value:'12',picks:[],shaded:[],tries:1,wrong:['7'],hint:true,status:'wrong',stage:'try',at:T+1005},updatedAt:T+1005};
  writeSessions(kv,'guest',{[a.id]:{session,rev:0,dirty:false}});const reloadedProgress=sanitize(JSON.parse(JSON.stringify(progress)))!;
  const restored=readSessions(kv,'guest')[a.id].session;expect(restored).toEqual(session);
  const c=checkSession(a,restored);expect(c.ok).toBe(true);if(c.ok)expect(c.questions).toEqual(questions);
  expect(resumePosition(restored)).toBe(2);expect(restored.draft).toMatchObject({value:'12',tries:1,hint:true,wrong:['7']});
  expect(reloadedProgress.totals.attempted).toBe(2);expect(reloadedProgress.primary.activities[a.id].attempts).toBe(2);
  expect(unfinishedSessions(combineAll([restored],sessionsFromHistory(reloadedProgress.primary.history)))[0].id).toBe(session.id);
 });
 it('counts each answer, completion and star once across retries, refreshes and a second tab',()=>{
  let {session,questions}=createSession(a,{seed:5,now:T}),progress=initialProgress();const all:ProgressEvent[]=[];
  while(session.results.length<session.count){const r=answer(session,questions,session.results.length!==1);session={...r.session,cursor:r.session.results.length};all.push(...r.events);progress=apply(progress,r.events);progress=apply(progress,r.events);}
  const once=progress;progress=apply(progress,all);progress=apply(progress,all);
  expect(progress.totals).toEqual(once.totals);expect(progress.totals.attempted).toBe(session.count);expect(progress.totals.sessions).toBe(1);expect(progress.totals.stars).toBe(starsFor(session.results));
  expect(progress.primary.activities[a.id]).toMatchObject({attempts:session.count,sessions:1,stars:starsFor(session.results)});
  // A different client could only repeat a position with another ID; saved history still recognises it.
  const again={...all[0],id:crypto.randomUUID()};expect(apply(progress,[again]).totals).toEqual(progress.totals);
 });
 it('continues on a second device from the saved answer history the account API already stores',()=>{
  let {session,questions}=createSession(a,{seed:99,now:T}),server=initialProgress();
  for(let i=0;i<3;i++){const r=answer(session,questions);session={...r.session,cursor:i+1};server=apply(server,r.events);}
  const secondDevice=sanitize(JSON.parse(JSON.stringify(server)))!;const merged=combineAll([],sessionsFromHistory(secondDevice.primary.history))[a.id];
  expect(merged).toMatchObject({id:session.id,seed:99,count:session.count,cursor:3,draft:null,completedAt:null});expect(merged.results.map(r=>r.answer)).toEqual(session.results.map(r=>r.answer));
  const c=checkSession(a,merged);expect(c.ok).toBe(true);if(c.ok)expect(c.questions).toEqual(questions);
  // The first device's own copy (with a draft) merges with the history copy.
  const local={...session,draft:{position:3,value:'4',picks:[],shaded:[],tries:0,wrong:[],hint:false,status:'answering' as const,stage:'try' as const,at:T+2000},updatedAt:T+2000};
  expect(combineAll([local],sessionsFromHistory(server.primary.history))[a.id]).toMatchObject({cursor:3,draft:{value:'4'}});
  while(session.results.length<session.count){const r=answer(session,questions);session={...r.session,cursor:r.session.results.length};server=apply(server,r.events);}
  expect(unfinishedSessions(combineAll([],sessionsFromHistory(server.primary.history)))).toHaveLength(0);
 });
 it('keeps guest and account sessions separate on a shared device',()=>{
  const kv=memory(),{session}=createSession(a,{seed:1,now:T});
  writeSessions(kv,'guest',{[a.id]:{session,rev:0,dirty:false}});
  expect(readSessions(kv,'student:pupil-1')).toEqual({});expect(readSessions(kv,'staff:teacher-1')).toEqual({});expect(storageKey('guest')).not.toBe(storageKey('student:pupil-1'));
  kv.setItem(storageKey('student:pupil-2'),kv.getItem(storageKey('guest'))!);expect(readSessions(kv,'student:pupil-2')).toEqual({});
  expect(readSessions(kv,'guest')[a.id].session).toEqual(session);
 });
 it('never trusts incomplete history and reports an older generator honestly',()=>{
  let {session,questions}=createSession(a,{seed:7,now:T}),server=initialProgress();
  for(let i=0;i<3;i++){const r=answer(session,questions);session={...r.session,cursor:i+1};server=apply(server,r.events);}
  const gap={...server.primary,history:server.primary.history!.filter((_,i)=>i!==0)};expect(sessionsFromHistory(gap.history)).toHaveLength(0);
  const old={...session,generator:'0'};expect(checkSession(a,old)).toEqual({ok:false,reason:'generator'});expect(server.totals.attempted).toBe(3);
 });
});

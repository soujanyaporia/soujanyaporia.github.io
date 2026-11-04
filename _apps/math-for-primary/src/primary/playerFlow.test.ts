import {describe,it,expect} from 'vitest';
import {ACTIVITIES,activityById} from './catalog';
import {advanceSession,type ScoredResult} from './session';
import {createSession,checkSession,fingerprint} from './sessionQuestions';
import {createSessionCache,type KV,type SessionEntries} from './sessionStore';
import {blankDraft,draftAnswer,draftReady,usableDraft} from './sessionDraft';
import {correctAnswer,type Question} from './generate';
import {spokenQuestion} from './QuestionContext';

const memory=():KV=>{const values=new Map<string,string>();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>{values.delete(k);}};};
const question=(extra:Partial<Question>={}):Question=>({key:'q',prompt:'Shade the parts.',answer:'2/5',hint:'Use equal parts.',explanation:'Two of five parts.',...extra});
describe('Question player recovery and movement',()=>{
 it('removes unreachable and duplicate resumed selections without throwing away a valid answer',()=>{
  const old={...blankDraft(0,'practice'),shaded:[1,1,22],picks:['stale'],tries:2,hint:true};
  const q=question({fractionBuilder:5}),draft=usableDraft(q,old);
  expect(draft.shaded).toEqual([1]);expect(draft.picks).toEqual([]);expect(draft.tries).toBe(2);expect(draft.hint).toBe(true);
  const completed={...draft,shaded:[...draft.shaded,3]};expect(correctAnswer(q,draftAnswer(q,completed))).toBe(true);
  const order=question({order:['8','2','5'],answer:'2,5,8'}),picks=usableDraft(order,{...old,picks:['2','2','gone','5']});
  expect(picks.picks).toEqual(['2','5']);expect(picks.shaded).toEqual([]);expect(draftReady(order,picks)).toBe(false);
  const final={...picks,picks:[...picks.picks,'8']};expect(draftReady(order,final)).toBe(true);expect(correctAnswer(order,draftAnswer(order,final))).toBe(true);
  expect(usableDraft(question({choices:['yes','no'],answer:'yes'}),{...old,value:'old option'}).value).toBe('');
 });
 it('allows a valid zero-shaded response and keeps count marks within the current picture',()=>{
  const q=question({fractionBuilder:5,answer:'0/5'}),d=blankDraft(0,'practice');expect(draftReady(q,d)).toBe(true);expect(correctAnswer(q,draftAnswer(q,d))).toBe(true);
  const count=question({answer:'3',picture:{type:'counters',count:3}});
  expect(usableDraft(count,{...d,shaded:[0,2,2,3,20],value:'3'})).toMatchObject({shaded:[0,2],value:'3'});
 });
 it('advances only a scored position and ignores an old double-tap without disabling future Next actions',()=>{
  const {session}=createSession(activityById('p1s-count-n0')!,{seed:33});expect(advanceSession(session,0)).toBe(session);
  const result:ScoredResult={answer:'5',correct:true,firstTry:true,hints:0,tries:1,wrong:[],at:Date.now()};
  const scored={...session,results:[result]},next=advanceSession(scored,0);expect(next.cursor).toBe(1);expect(advanceSession(next,0)).toBe(next);expect(advanceSession(next,1)).toBe(next);
  expect(advanceSession({...next,results:[result,result]},1).cursor).toBe(2);
 });
 it('uses the actual generated count in small-domain sessions and rejects an empty repair',()=>{
  const a=ACTIVITIES.find(a=>a.level===3&&a.kind==='parallel')!;
  const {session,questions}=createSession(a,{seed:77});expect(session.count).toBeGreaterThan(0);expect(session.count).toBe(questions.length);expect(checkSession(a,session).ok).toBe(true);
  expect(()=>createSession(a,{mode:'repair',repair:[],seed:77})).toThrow(/playable questions/);
 });
 it('includes essential context in narration and regenerated-question identity',()=>{
  const q=question({context:['Lina has 18 more badges than Noor.','Lina gives Noor 5 badges.'],prompt:'How many more badges does Lina have now?',answer:'8'});
  expect(spokenQuestion(q)).toBe('Lina has 18 more badges than Noor. Lina gives Noor 5 badges. How many more badges does Lina have now?');
  expect(fingerprint({...q,context:['Lina has 20 more badges than Noor.','Lina gives Noor 5 badges.']})).not.toBe(fingerprint(q));
 });
});

describe('Stable session cache',()=>{
 const entries=():SessionEntries=>{const {session}=createSession(activityById('p1s-count-n0')!,{seed:31});return {[session.activityId]:{session,rev:0,dirty:false}};};
 it('keeps read/write callbacks stable as drafts update and observes another device copy',()=>{
  const kv=memory(),cache=createSessionCache(kv,'guest'),read=cache.read,write=cache.write;
  const one=entries(),id=Object.keys(one)[0];cache.write(one);
  for(let i=0;i<5;i++){const s=cache.read()[id].session;cache.write({[id]:{...one[id],session:{...s,draft:{...blankDraft(0,'practice'),value:String(i),at:Date.now()}}}});expect(cache.read).toBe(read);expect(cache.write).toBe(write);}
  expect(cache.read()[id].session.draft?.value).toBe('4');
  const second=createSessionCache(kv,'guest');second.write({[id]:{...one[id],rev:2}});expect(cache.read()[id].rev).toBe(2);
 });
 it('keeps playing in memory when browser storage is unavailable or its quota is full',()=>{
  const denied:KV={getItem(){throw Error('Denied');},setItem(){throw Error('Full');},removeItem(){throw Error('Denied');}};
  for(const kv of [null,denied]){const cache=createSessionCache(kv,'guest'),saved=entries();expect(cache.write(saved)).toEqual(saved);expect(cache.read()).toEqual(saved);expect(cache.persistent).toBe(false);cache.clear();expect(cache.read()).toEqual({});}
 });
 it('merges another tab after a failed write without losing the newer draft or pending upload',()=>{
  for(const dirty of [false,true]){
   const backing=memory();let full=false;
   const kv:KV={getItem:k=>backing.getItem(k),removeItem:k=>backing.removeItem(k),setItem:(k,v)=>{if(full)throw Error('Quota full');backing.setItem(k,v);}};
   const scope=dirty?'student:17':'guest',cache=createSessionCache(kv,scope),one=entries(),id=Object.keys(one)[0],original=one[id],at=original.session.updatedAt;
   cache.write(one);full=true;
   const local={...original,dirty,session:{...original.session,updatedAt:at+10,draft:{...blankDraft(0,'practice'),value:'7',at:at+10}}};
   cache.write({[id]:local});expect(cache.persistent).toBe(false);
   const other=createSession(activityById('p1s-place-n1')!,{seed:5}).session;
   createSessionCache(backing,scope).write({[id]:{...original,rev:3},[other.activityId]:{session:other,rev:2,dirty:false}});
   const merged=cache.reload();
   expect(merged[id].session.draft?.value).toBe('7');expect(merged[id].dirty).toBe(dirty);expect(merged[id].rev).toBe(3);
   expect(merged[other.activityId].session.id).toBe(other.id);
   expect(cache.persistent).toBe(false);expect(cache.read()).toEqual(merged);
   full=false;cache.write(merged);expect(cache.persistent).toBe(true);
   expect(createSessionCache(backing,scope).read()[id].session.draft?.value).toBe('7');
  }
 });
});

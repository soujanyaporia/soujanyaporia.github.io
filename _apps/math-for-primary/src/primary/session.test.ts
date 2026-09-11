import {describe,it,expect} from 'vitest';
import {ACTIVITIES,activityById} from './catalog';
import {makeQuestion,type Question} from './generate';
import {answerEventId,combineSessions,completeEventId,encodeQuestionKey,mergeSameSession,parseQuestionKey,stableId,validateSession,type PrimarySession,type ScoredResult} from './session';
import {checkSession,createSession,diagnose,nearTransfer,questionFromKey,sessionQuestions,strategyOf} from './sessionQuestions';
const same=(q:Question)=>JSON.stringify([q.prompt,q.display,q.picture,q.answer]);
const scored=(answer:string,at:number,firstTry=true):ScoredResult=>({answer,correct:true,firstTry,hints:firstTry?0:1,tries:firstTry?1:2,wrong:firstTry?[]:['1'],at});
describe('resumable session identity',()=>{
 it('derives stable UUID-shaped event IDs that the account API accepts',()=>{
  const id=answerEventId('0123456789abcdef',3);expect(id).toMatch(/^[a-f0-9-]{36}$/);expect(id).toBe(answerEventId('0123456789abcdef',3));
  const ids=new Set([completeEventId('0123456789abcdef'),...Array.from({length:20},(_,p)=>answerEventId('0123456789abcdef',p)),answerEventId('fedcba9876543210',0)]);expect(ids.size).toBe(22);
  expect(stableId('a')).not.toBe(stableId('b'));
 });
 it('saves question keys within the API limit that rebuild the same question for every activity',()=>{
  for(const a of ACTIVITIES){const {session,questions}=createSession(a,{seed:4294967295,now:1});expect(session.count,a.id).toBe(questions.length);
   questions.forEach((q,i)=>{const key=encodeQuestionKey(session,i,q.key),k=parseQuestionKey(key)!;expect(key.length).toBeLessThanOrEqual(200);expect(k.activityId).toBe(a.id);expect(k.session).toEqual({id:session.id,position:i,count:session.count,generator:session.generator,fingerprint:session.fingerprints[i],mode:'practice'});expect(questionFromKey(a,k.content)).toEqual(q);});}
  expect(parseQuestionKey('p1s-count-n0:12:3')?.session).toBeNull();expect(parseQuestionKey('p1s-count-n0:12:3-repair-0')).toBeNull();
 });
 it('regenerates a saved session exactly and refuses one from a changed generator',()=>{
  for(const id of ['p3s-fractionEquivalent-n9','p1s-order-n3','p2s-fractionShade-n11','p6s-circle-quarter-g3']){const a=activityById(id)!,{session,questions}=createSession(a,{seed:77,now:1}),saved:PrimarySession=JSON.parse(JSON.stringify(session));
   const c=checkSession(a,saved);expect(c.ok,id).toBe(true);if(c.ok)expect(c.questions).toEqual(questions);
   expect(checkSession(a,{...saved,generator:'0'})).toEqual({ok:false,reason:'generator'});
   expect(checkSession(a,{...saved,fingerprints:saved.fingerprints.map((f,i)=>i===1?'00000000':f)})).toEqual({ok:false,reason:'questions'});
   expect(checkSession(activityById('p1s-count-n0')!,saved)).toEqual({ok:false,reason:'activity'});}
 });
 it('validates stored and uploaded sessions strictly',()=>{
  const a=activityById('p2s-add-n5')!,{session}=createSession(a,{seed:5,now:1000});
  const draft={position:1,value:'12',picks:[],shaded:[],tries:1,wrong:['7'],hint:true,status:'wrong' as const,stage:'try' as const,at:1002};
  const good={...session,results:[scored('9',1001)],cursor:1,draft,updatedAt:1002};
  expect(validateSession(good,2000)).toEqual(good);
  expect(validateSession({...good,extra:'ignored'},2000)).toEqual(good);
  for(const bad of [{...good,activityId:'p9-unknown'},{...good,id:'short'},{...good,draft:{...draft,position:0}},{...good,cursor:2},{...good,results:[{...scored('9',1001),hints:1}]},{...good,completedAt:1003},{...good,fingerprints:good.fingerprints.slice(1)},{...good,seed:-1},{...good,draft:{...draft,value:'x'.repeat(101)}},{...good,updatedAt:10**12}])expect(validateSession(bad,2000)).toBeNull();
  expect(validateSession({...good,results:Array.from({length:good.count},(_,i)=>scored(String(i),1001)),draft:null,cursor:good.count,completedAt:1003,stars:3},2000)).not.toBeNull();
 });
});
describe('mistake repair',()=>{
 it('gives a fresh question on the same idea, never the identical question',()=>{
  let matched=0,total=0;
  for(const a of ACTIVITIES)for(let seed=0;seed<4;seed++){const original=makeQuestion(a,seed,0),transfer=nearTransfer(a,original,9000+seed,0,new Set());expect(same(transfer),a.id).not.toBe(same(original));total++;if(strategyOf(transfer)===strategyOf(original))matched++;}
  expect(matched/total).toBeGreaterThan(.95);
 });
 it('rebuilds a repair session deterministically from the original question identities',()=>{
  const a=ACTIVITIES.find(x=>x.kind==='decimalRound'&&x.level===4)!,practice=createSession(a,{seed:31,now:1});
  const repair=[0,3].map(i=>({key:practice.questions[i].key,fingerprint:practice.session.fingerprints[i],wrong:['2.5'],revealed:false}));
  const {session,questions}=createSession(a,{mode:'repair',repair,repairOf:practice.session.id,seed:44,now:2});
  expect(session.count).toBe(2);expect(sessionQuestions(a,session)).toEqual(questions);expect(checkSession(a,session).ok).toBe(true);
  questions.forEach((q,i)=>{expect(same(q)).not.toBe(same(practice.questions[[0,3][i]]));expect(strategyOf(q)).toBe(strategyOf(practice.questions[[0,3][i]]));});
  expect(new Set(questions.map(same)).size).toBe(2);
 });
 it('explains a clear error pattern and stays silent otherwise',()=>{
  const q=(answer:string,proof:Question['proof'],extra:Partial<Question>={}):Question=>({key:'k',prompt:'p',hint:'h',explanation:'e',answer,proof,...extra});
  expect(diagnose(q('45',{op:'*',a:9,b:5}),'450')).toMatch(/10 times too large/);
  expect(diagnose(q('4.5',{op:'/',a:45,b:10}),'0.45')).toMatch(/10 times too small/);
  expect(diagnose(q('12',{op:'-',a:{op:'*',a:3,b:6},b:6}),'18')).toMatch(/one step correctly: 3 × 6 = 18/);
  expect(diagnose(q('35',{op:'-',a:52,b:17}),'69')).toMatch(/joining the two numbers/);
  expect(diagnose(q('69',{op:'+',a:52,b:17}),'35')).toMatch(/taking one number away/);
  expect(diagnose(q('9',9),'10')).toMatch(/one away/);
  expect(diagnose(q('35',{op:'-',a:52,b:17}),'40')).toBeNull();
  expect(diagnose(q('Odd',undefined,{choices:['Odd','Even']}),'Even')).toBeNull();
  expect(diagnose(q('35',{op:'-',a:52,b:17}),'abc')).toBeNull();
 });
});
describe('combining copies of one session',()=>{
 const a=activityById('p1s-add-n6')!,{session}=createSession(a,{seed:9,now:100});
 it('keeps each scored answer once and lets saved answer history decide a conflicting score',()=>{
  const here={...session,results:[scored('5',101),scored('6',102)],cursor:2,updatedAt:102};
  const there={...session,results:[scored('5',101)],cursor:1,draft:{position:1,value:'3',picks:[],shaded:[],tries:0,wrong:[],hint:false,status:'answering' as const,stage:'try' as const,at:150},updatedAt:150};
  const merged=mergeSameSession(here,there);expect(merged.results).toHaveLength(2);expect(merged.draft).toBeNull();expect(merged.cursor).toBe(2);expect(merged.updatedAt).toBe(150);
  const history={...session,results:[scored('5',101),{...scored('7',103),firstTry:false,correct:false,hints:0,tries:1,wrong:[]}],cursor:2};
  expect(mergeSameSession(here,history,true).results[1].answer).toBe('7');
 });
 it('lets a newer session replace an older one for the same activity',()=>{
  const newer={...createSession(a,{seed:10,now:500}).session};expect(combineSessions(session,newer)).toBe(newer);expect(combineSessions(newer,session)).toBe(newer);expect(combineSessions(undefined,session)).toBe(session);
 });
});

import {describe,it,expect} from 'vitest';
import type {Question} from './generate';
import {generatePracticePaper} from './practicePaper';
import {createPaperAttempt,restorePaperAttempt,readPaperAttempt,readPaperAttemptState,writePaperAttempt,clearPaperAttempt,paperAttemptKey,paperAnswerStatus,paperMarks,updatePaperAnswer,movePaperQuestion,markPaperAttempt} from './paperAttempt';
import type {KV} from './sessionStore';

const paper=()=>generatePracticePaper({level:3,track:'standard',count:6,topic:'mixed',seed:817});
const q=(extra:Partial<Question>={}):Question=>({key:'test',prompt:'Find the answer.',answer:'0',hint:'Try a picture.',explanation:'Count carefully.',...extra});
const store=():KV=>{const entries=new Map<string,string>();return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>{entries.set(k,v);},removeItem:k=>{entries.delete(k);}};};

describe('Practice paper attempts',()=>{
 it('treats blank and unfinished answers honestly across all response types',()=>{
  expect(paperAnswerStatus(q(),'')).toBe('blank');expect(paperAnswerStatus(q(),' \n ')).toBe('blank');expect(paperAnswerStatus(q(),'0')).toBe('complete');
  expect(paperAnswerStatus(q(),'2/')).toBe('partial');expect(paperAnswerStatus(q(),'1/0')).toBe('partial');expect(paperAnswerStatus(q(),'2.5')).toBe('complete');
  const choice=q({answer:'right angle',choices:['acute angle','right angle','obtuse angle']});
  expect(paperAnswerStatus(choice,'right angle')).toBe('complete');expect(paperAnswerStatus(choice,'right')).toBe('partial');
  const order=q({answer:'2,3,8',order:['3','8','2']});
  expect(paperAnswerStatus(order,'2,3')).toBe('partial');expect(paperAnswerStatus(order,'2,2,8')).toBe('partial');expect(paperAnswerStatus(order,'2,3,9')).toBe('partial');expect(paperAnswerStatus(order,'8,3,2')).toBe('complete');
  const fraction=q({answer:'2/4',fractionBuilder:4});
  expect(paperAnswerStatus(fraction,'')).toBe('blank');expect(paperAnswerStatus(fraction,'0/4')).toBe('complete');expect(paperAnswerStatus(fraction,'2/4')).toBe('complete');expect(paperAnswerStatus(fraction,'5/4')).toBe('partial');expect(paperAnswerStatus(fraction,'2/0')).toBe('partial');expect(paperAnswerStatus(fraction,'1/2')).toBe('partial');
 });
 it('marks completed responses, including equivalent fractions, without giving blank zero answers credit',()=>{
  const p=paper(),questions=[q(),q({answer:'red',choices:['red','blue']}),q({answer:'2,3,8',order:['8','2','3']}),q({answer:'2/4',fractionBuilder:4}),q({answer:'3/4'}),q({answer:'1/2',requireSimplified:true})];
  const synthetic={...p,items:p.items.map((item,i)=>({...item,question:questions[i]}))};
  expect(paperMarks(synthetic,[' ','red','2,3','2/4','0.75','2/4'])).toEqual({statuses:['blank','complete','partial','complete','complete','complete'],right:[false,true,false,true,true,false],correct:3,answered:4,unfinished:2,blank:1});
  expect(paperMarks(synthetic,['0','red','2,3,8','2/4','3/4','1/2']).correct).toBe(6);
 });
 it('keeps saved answers, position, and marked state through reload, with compact semantic fingerprints',()=>{
  const p=paper();let attempt=createPaperAttempt(p);
  attempt=updatePaperAnswer(attempt,'27');attempt=movePaperQuestion(attempt,4);attempt=updatePaperAnswer(attempt,'3/4');
  const restored=restorePaperAttempt(JSON.stringify(attempt))!;expect(restored.paper).toEqual(p);expect(restored.saved).toEqual(attempt);
  const marked=markPaperAttempt(attempt);expect(marked.position).toBe(0);expect(marked.marked).toBe(true);expect(marked.answers).toEqual(attempt.answers);
  expect(restorePaperAttempt(JSON.stringify(marked))!.saved).toEqual(marked);expect(marked.fingerprint.length).toBeLessThan(1000);
  expect(updatePaperAnswer(marked,'999')).toBe(marked);expect(movePaperQuestion(marked,2).position).toBe(2);
  for(const n of [-1,6,1.5,NaN,Infinity])expect(movePaperQuestion(attempt,n)).toBe(attempt);
  expect(updatePaperAnswer(attempt,'9'.repeat(101)).answers[4]).toHaveLength(100);
 });
 it('rejects malformed snapshots and changed grading while preserving work after an explanation edit',()=>{
  const p=paper(),attempt=createPaperAttempt(p);
  const narrated={...p,items:p.items.map(item=>({...item,question:{...item.question,hint:'A clearer hint.',explanation:'A clearer explanation.'}}))};
  expect(createPaperAttempt(narrated).fingerprint).toBe(attempt.fingerprint);
  const changed={...p,items:p.items.map((item,i)=>i?item:{...item,question:{...item.question,answer:'999999'}})};
  expect(restorePaperAttempt(JSON.stringify(createPaperAttempt(changed)))).toBeNull();
  const bad:unknown[]=[null,[],{},'{not json', {...attempt,position:-1},{...attempt,position:6},{...attempt,position:1.2},{...attempt,marked:'yes'},{...attempt,answers:[]},{...attempt,answers:[null,...attempt.answers.slice(1)]},{...attempt,answers:['a'.repeat(101),...attempt.answers.slice(1)]},{...attempt,code:attempt.code+'X'},{...attempt,fingerprint:'wrong'}];
  for(const value of bad)expect(restorePaperAttempt(typeof value==='string'?value:JSON.stringify(value))).toBeNull();
  expect(restorePaperAttempt(' '.repeat(32769))).toBeNull();
 });
 it('isolates guest and student attempts and reports unavailable or full storage',()=>{
  const kv=store(),p=paper(),guest=updatePaperAnswer(createPaperAttempt(p),'17'),student=updatePaperAnswer(createPaperAttempt(p),'28');
  expect(writePaperAttempt(kv,'guest',guest)).toBe(true);expect(writePaperAttempt(kv,'student:42',student)).toBe(true);
  expect(readPaperAttempt(kv,'guest')!.saved.answers[0]).toBe('17');expect(readPaperAttempt(kv,'student:42')!.saved.answers[0]).toBe('28');expect(readPaperAttempt(kv,'student:43')).toBeNull();
  expect(paperAttemptKey('guest')).not.toBe(paperAttemptKey('student:42'));
  expect(writePaperAttempt(null,'guest',guest)).toBe(false);expect(readPaperAttempt(null,'guest')).toBeNull();
  const denied:KV={getItem(){throw Error('Storage denied');},setItem(){throw Error('Storage full');},removeItem(){}};
  expect(writePaperAttempt(denied,'guest',guest)).toBe(false);expect(readPaperAttempt(denied,'guest')).toBeNull();
  expect(readPaperAttemptState(denied,'guest').status).toBe('unavailable');
 });
 it('reports an incompatible saved copy without deleting it or confusing it with no previous paper',()=>{
  const kv=store(),key=paperAttemptKey('guest');expect(readPaperAttemptState(kv,'guest').status).toBe('none');
  const old=JSON.stringify({...createPaperAttempt(paper()),fingerprint:'earlier version'});kv.setItem(key,old);
  expect(readPaperAttemptState(kv,'guest')).toEqual({restored:null,status:'incompatible'});expect(kv.getItem(key)).toBe(old);
  writePaperAttempt(kv,'guest',createPaperAttempt(paper()));expect(readPaperAttemptState(kv,'guest').status).toBe('restored');
 });
 it('removes only the requested guest or account copy during a wipe or sign out',()=>{
  const kv=store(),attempt=createPaperAttempt(paper());for(const scope of ['guest','student:42','student:43','staff:7'])writePaperAttempt(kv,scope,attempt);
  clearPaperAttempt(kv,'guest');expect(readPaperAttempt(kv,'guest')).toBeNull();expect(readPaperAttempt(kv,'student:42')).not.toBeNull();
  clearPaperAttempt(kv,'student:42');expect(readPaperAttempt(kv,'student:42')).toBeNull();expect(readPaperAttempt(kv,'student:43')).not.toBeNull();expect(readPaperAttempt(kv,'staff:7')).not.toBeNull();
  expect(()=>clearPaperAttempt(null,'guest')).not.toThrow();
 });
});

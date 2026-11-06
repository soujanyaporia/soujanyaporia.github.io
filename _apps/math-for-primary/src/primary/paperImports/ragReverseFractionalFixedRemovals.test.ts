import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragReverseFractionalFixedRemovals';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

/** Solves from the visible context and prompt only; it never reads q.answer. */
function solveVisible(context:string[],prompt:string){
 const lines=context.filter(l=>/\d/.test(l));
 const last=Number(/\d+/.exec(lines[lines.length-1])![0]);
 const before:number[]=new Array(lines.length-1);
 let now=last;
 for(let i=lines.length-2;i>=0;i--){
  const line=lines[i],fr=/(\d+)\/(\d+)/.exec(line),more=/(\d+) more/.exec(line);
  if(fr){
   const n=Number(fr[1]),d=Number(fr[2]),extra=more?Number(more[1]):0,x=now+extra;
   expect(x%(d-n)).toBe(0);
   now=x/(d-n)*d;
  }else{
   now+=Number(/\d+/.exec(line)![0]);
  }
  expect(Number.isInteger(now)).toBe(true);
  before[i]=now;
 }
 return prompt.includes('at first')?before[0]:before[0]-before[1];
}

describe('reverse fractional and fixed removals',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-reverse-fractional-and-fixed-removals');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('answers match an independent solution from the visible givens',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.context&&q.context.length).toBeGreaterThanOrEqual(4);
   expect(Number(q.answer)).toBe(solveVisible(q.context!,q.prompt));
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(Number.isInteger(Number(q.answer))).toBe(true);
   expect(q.workedSteps&&q.workedSteps.length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(0);
  }
 });

 it('is deterministic and gives distinct keys',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const keys=new Set<string>();
  for(let i=0;i<20;i++)keys.add(makeRagQuestion(3,i).key);
  expect(keys.size).toBe(20);
 });

 it('uses all four variants and varied data',()=>{
  const sigs=new Set<string>(),answers=new Set<string>();
  for(let i=0;i<4;i++){
   const q=makeRagQuestion(11,i),lines=q.context!.filter(l=>/\d/.test(l)).slice(0,-1);
   sigs.add(lines.map(l=>/\d+\/\d+/.test(l)?(/ more/.test(l)?'B':'F'):'X').join('')+(q.prompt.includes('at first')?':total':':share'));
  }
  expect(sigs.size).toBe(4);
  for(let seed=1;seed<=30;seed++)answers.add(makeRagQuestion(seed,0).answer);
  expect(answers.size).toBeGreaterThan(5);
 });

 it('final worked equation reaches the answer',()=>{
  for(let seed=1;seed<=20;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),steps=q.workedSteps!;
   expect(steps[steps.length-1].equation).toMatch(new RegExp(`= ${q.answer}$`));
  }
 });
});

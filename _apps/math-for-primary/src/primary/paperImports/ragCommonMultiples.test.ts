import {describe,expect,it} from 'vitest';
import {correctAnswer,type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {RAG_PATTERN,makeRagQuestion} from './ragCommonMultiples';

/** Solves from the visible context, prompt and choices only. */
function solve(q:Question):string{
 const text=[...(q.context??[]),q.prompt].join(' ');
 const all=(re:RegExp)=>[...text.matchAll(re)].map(m=>Number(m[1]));
 const both=(n:number,ds:number[])=>ds.length===2&&ds.every(d=>n%d===0);
 if(text.includes('divides it by')){
  const [lo,hi]=text.match(/between (\d+) and (\d+)/)!.slice(1).map(Number),ds=all(/divides it by (\d+)/g);
  const found=q.choices!.map(Number).filter(n=>n>lo&&n<hi&&both(n,ds));
  expect(found).toHaveLength(1);return String(found[0]);
 }
 if(text.includes('fewer than')){
  const lo=Number(/more than (\d+)/.exec(text)![1]),hi=Number(/fewer than (\d+)/.exec(text)![1]),ds=all(/ of (\d+)/g);
  const found=Array.from({length:hi-lo-1},(_,i)=>lo+1+i).filter(n=>both(n,ds));
  expect(found).toHaveLength(1);return String(found[0]);
 }
 const ds=all(/ of (\d+)/g),found=q.choices!.map(Number).filter(n=>both(n,ds));
 expect(found).toHaveLength(1);return String(found[0]);
}

describe('common multiple exact grouping',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(3);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p3-common-multiple-exact-grouping');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });
 it('matches an independent solver across seeds and indexes',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   expect(solve(q)).toBe(q.answer);
   expect(correctAnswer(q,q.answer)).toBe(true);
   expect(q.workedSteps!.length).toBeGreaterThan(1);
   expect(q.hint.length).toBeGreaterThan(0);
  }
 });
 it('keeps choices distinct with exactly one correct choice',()=>{
  let withChoices=0;
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   if(!q.choices)continue;withChoices++;
   expect(q.choices).toHaveLength(4);
   expect(new Set(q.choices).size).toBe(4);
   expect(q.choices).toContain(q.answer);
   for(const c of q.choices.filter(c=>c!==q.answer))expect(correctAnswer(q,c)).toBe(false);
  }
  expect(withChoices).toBeGreaterThan(0);
 });
 it('uses all three variants and is deterministic',()=>{
  const kinds=new Set([0,1,2].map(i=>{const q=makeRagQuestion(7,i);return q.choices?(q.prompt==='Which number is it?'?'bounded-choice':'packing-choice'):'bounded-entry';}));
  expect(kinds.size).toBe(3);
  expect(makeRagQuestion(5,2)).toEqual(makeRagQuestion(5,2));
 });
});

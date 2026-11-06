import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {RAG_PATTERN,makeRagQuestion} from './ragP6PartWholeComplement';

const firstInt=(s:string)=>Number(/(\d+)/.exec(s)![1]);

/** Solves from the visible context and prompt only; never reads the stored answer. */
function solve(q:Question):{value:number;kind:'whole'|'complement'|'stock'}{
 const c=q.context??[],percents=[...c.join(' ').matchAll(/(\d+)%/g)].map(m=>Number(m[1]));
 if(q.prompt.includes('altogether')){
  const known=firstInt(c[1]);return {value:known*100/(100-percents[0]),kind:'whole'};
 }
 if(q.prompt.includes('at first')){
  const aSold=firstInt(c[1]),[redShare,soldShare,aUnsold]=percents;
  const sold=aSold*100/(100-redShare),stock=sold*100/soldShare,unsold=stock-sold;
  return {value:(sold-aSold)+unsold*(100-aUnsold)/100,kind:'stock'};
 }
 const known=Number(/There are (\d+)/.exec(c.join(' '))![1]),whole=known*100/percents[0];
 return {value:whole-known,kind:'complement'};
}

describe('part, whole and complement percentage generator',()=>{
 it('has valid metadata and curriculum skill ids',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-part-whole-complement-percentage');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution of the visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),s=solve(q);
   kinds.add(s.kind);
   expect(Number.isInteger(s.value)).toBe(true);
   expect(s.value).toBeGreaterThan(0);
   expect(Number(q.answer)).toBe(s.value);
  }
  expect([...kinds].sort()).toEqual(['complement','stock','whole']);
 });

 it('keeps every stated percentage of a whole count a whole number',()=>{
  for(let seed=1;seed<=30;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),c=q.context!,percents=[...c.join(' ').matchAll(/(\d+)%/g)].map(m=>Number(m[1]));
   for(const p of percents)expect(p).toBeGreaterThan(0);
   for(const p of percents)expect(p).toBeLessThan(100);
   const total=solve(q).kind==='whole'?Number(q.answer):solve(q).kind==='complement'?Number(q.answer)+Number(/There are (\d+)/.exec(c.join(' '))![1]):null;
   if(total!==null)expect(Number.isInteger(total*percents[0]/100)).toBe(true);
  }
 });

 it('is deterministic, varied and has worked steps ending in the answer',()=>{
  const prompts=new Set<string>();
  for(let index=0;index<45;index++){
   const a=makeRagQuestion(7,index),b=makeRagQuestion(7,index);
   expect(a).toEqual(b);
   prompts.add(JSON.stringify([a.prompt,a.context]));
   expect(a.picture).toBeUndefined();
   expect(a.workedSteps!.length).toBeGreaterThanOrEqual(2);
   expect(a.workedSteps!.at(-1)!.equation).toContain(`= ${a.answer}`);
   expect(a.hint.length).toBeGreaterThan(10);
   expect(a.explanation.length).toBeGreaterThan(10);
  }
  expect(prompts.size).toBeGreaterThan(30);
 });
});

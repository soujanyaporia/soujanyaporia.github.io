import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragRatioKnownShare';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';

/** Solves from the visible context and prompt only. */
function solveVisible(q:Question):{value:number;kind:string}{
 const ctx=q.context!;
 const m=/^(.+?) shared some (\w+) in the ratio ([\d : ]+?)\./.exec(ctx[0])!;
 expect(m).toBeTruthy();
 const names=m[1].split(/, | and /),terms=m[3].split(' : ').map(Number);
 expect(names.length).toBe(terms.length);
 const known=/^(\w+) had (\d+) /.exec(ctx[1])!;
 expect(known).toBeTruthy();
 const knownIndex=names.indexOf(known[1]);
 expect(knownIndex).toBeGreaterThanOrEqual(0);
 const oneUnit=Number(known[2])/terms[knownIndex];
 expect(Number.isInteger(oneUnit)).toBe(true);
 if(/altogether/.test(q.prompt))return {value:oneUnit*terms.reduce((a,b)=>a+b,0),kind:'total'};
 const more=/^How many more \w+ did (\w+) have than (\w+)\?$/.exec(q.prompt);
 if(more){
  const a=terms[names.indexOf(more[1])],b=terms[names.indexOf(more[2])];
  expect(a).toBeGreaterThan(b);
  return {value:oneUnit*(a-b),kind:terms.length===2?'difference-two':'difference-three'};
 }
 const single=/^How many \w+ did (\w+) have\?$/.exec(q.prompt)!;
 expect(single).toBeTruthy();
 expect(single[1]).not.toBe(known[1]);
 return {value:oneUnit*terms[names.indexOf(single[1])],kind:'share'};
}

describe('ragRatioKnownShare',()=>{
 it('declares metadata with real curriculum skills',()=>{
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-ratio-scaling-known-share');
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution of the visible givens across seeds',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(Number(q.answer)).toBe(solveVisible(q).value);
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(q.unit).toBeTruthy();
   expect(q.hint.length).toBeGreaterThan(5);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
  }
 });

 it('covers all four variants and is deterministic',()=>{
  const kinds=new Set<string>();
  for(let index=0;index<16;index++){
   const q=makeRagQuestion(7,index);
   kinds.add(solveVisible(q).kind);
   expect(makeRagQuestion(7,index)).toEqual(q);
  }
  expect(kinds).toEqual(new Set(['total','difference-two','share','difference-three']));
 });

 it('uses simplified ratios, distinct names and varied questions',()=>{
  const seen=new Set<string>();
  for(let index=0;index<40;index++){
   const q=makeRagQuestion(3,index),m=/in the ratio ([\d : ]+?)\./.exec(q.context![0])!;
   const terms=m[1].split(' : ').map(Number);
   const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
   expect(terms.reduce(gcd)).toBe(1);
   expect(new Set(terms).size).toBe(terms.length);
   seen.add(JSON.stringify([q.context,q.prompt]));
  }
  expect(seen.size).toBeGreaterThan(30);
 });
});

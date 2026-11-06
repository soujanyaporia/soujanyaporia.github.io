import {describe,expect,it} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragRatioEqualityInitialDifference';

/** Solves from the visible context and prompt only. */
function solveVisible(q:Question):{answer:number;kind:string}{
 const text=(q.context??[]).join(' ');
 const ratio=/ratio of the number of (\w+) to the number of (\w+) is (\d+) : (\d+)/.exec(text);
 if(!ratio)throw new Error('ratio not found');
 const first=ratio[1],second=ratio[2],p=Number(ratio[3]),s=Number(ratio[4]);
 const delta:Record<string,number>={[first]:0,[second]:0};
 let kind='';
 const opp=/(\d+) more (\w+) were put in and (\d+) (\w+) were taken out/.exec(text);
 const rem=/(\d+) (\w+) and (\d+) (\w+) were given away/.exec(text);
 if(opp){delta[opp[2]]+=Number(opp[1]);delta[opp[4]]-=Number(opp[3]);kind='opposite';}
 else if(rem){delta[rem[2]]-=Number(rem[1]);delta[rem[4]]-=Number(rem[3]);kind='removal';}
 else throw new Error('change not found');
 // p*u + delta[first] = s*u + delta[second]
 const u=(delta[second]-delta[first])/(p-s);
 if(/altogether/.test(q.prompt))return {answer:(p+s)*u,kind:kind+'-total'};
 const ask=/How many (\w+) were there at first\?/.exec(q.prompt);
 if(!ask)throw new Error('prompt not understood');
 return {answer:(ask[1]===first?p:s)*u,kind:kind+'-item'};
}

describe('ragRatioEqualityInitialDifference',()=>{
 it('has valid pattern metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-equality-reveals-initial-difference');
  const ids=new Set(CURRICULUM_SKILLS.map(skill=>skill.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution of the visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=0;seed<150;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),solved=solveVisible(q);
   kinds.add(solved.kind);
   expect(Number.isInteger(solved.answer)).toBe(true);
   expect(solved.answer).toBeGreaterThan(0);
   expect(q.answer).toBe(String(solved.answer));
  }
  expect(kinds.size).toBe(4);
 });

 it('keeps both amounts positive and equal after the stated changes',()=>{
  for(let seed=0;seed<80;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),text=(q.context??[]).join(' ');
   const ratio=/is (\d+) : (\d+)\./.exec(text);
   if(!ratio)throw new Error('ratio not found');
   const small=Math.min(Number(ratio[1]),Number(ratio[2])),large=Math.max(Number(ratio[1]),Number(ratio[2]));
   const names=/some (\w+) and some (\w+)\./.exec(text);
   if(!names)throw new Error('names not found');
   const opp=/(\d+) more \w+ were put in and (\d+) \w+ were taken out/.exec(text);
   const rem=/(\d+) \w+ and (\d+) \w+ were given away/.exec(text);
   const change=opp??rem;
   if(!change)throw new Error('change not found');
   const x=Number(change[1]),y=Number(change[2]);
   const unit=(opp?x+y:y-x)/(large-small);
   expect(Number.isInteger(unit)).toBe(true);
   const smallAfter=small*unit+(opp?x:-x),largeAfter=large*unit-y;
   expect(smallAfter).toBe(largeAfter);
   expect(smallAfter).toBeGreaterThan(0);
  }
 });

 it('is deterministic, varied, and includes worked steps',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set<string>(),keys=new Set<string>();
  for(let seed=0;seed<40;seed++){
   const q=makeRagQuestion(seed,0);
   prompts.add(JSON.stringify([q.context,q.prompt]));
   keys.add(q.key);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
  }
  expect(prompts.size).toBeGreaterThan(30);
  expect(keys.size).toBe(40);
 });
});

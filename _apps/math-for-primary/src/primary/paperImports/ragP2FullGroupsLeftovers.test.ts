import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP2FullGroupsLeftovers';
import type {Question} from '../generate';

const nums=(s:string)=>(s.match(/\d+/g)??[]).map(Number);
/** Independent solver: reads only visible context and adds capacity until it reaches the total. */
function visible(q:Question){
 const ctx=q.context??[];
 const cap=nums(ctx[0])[0];
 let total:number;
 if(ctx.length===3){const [groups,each]=nums(ctx[1]);expect(each).toBe(cap);total=groups*each+nums(ctx[2])[0];}
 else total=nums(ctx[1])[0];
 let k=0;while(k*cap<total)k++;
 return {cap,total,k};
}

describe('P2 full groups and leftovers',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(2);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p2-full-groups-leftovers');
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P2\.S\.MD\.0[12]$/);
 });
 it('matches an independent solution across seeds and indexes',()=>{
  for(let seed=0;seed<150;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),{cap,total,k}=visible(q);
   expect(Number(q.answer)).toBe(k);
   expect([3,4,5,10]).toContain(cap);
   expect(total%cap).not.toBe(0);
   expect(k*cap).toBeGreaterThanOrEqual(total);
   expect((k-1)*cap).toBeLessThan(total);
   expect(Number(q.answer)).not.toBe(Math.floor(total/cap));
   expect(total).toBeLessThan(100);
   expect(cap===5&&total===24).toBe(false);
  }
 });
 it('uses all three variants deterministically',()=>{
  const kinds=new Set<string>();
  for(let seed=0;seed<30;seed++){
   const q=makeRagQuestion(seed,0);
   kinds.add((q.context?.length===3)?'packed':q.prompt.includes('trips')?'trips':'direct');
   expect(makeRagQuestion(seed,0)).toEqual(q);
  }
  expect([...kinds].sort()).toEqual(['direct','packed','trips']);
 });
 it('includes worked steps, hint and explanation',()=>{
  for(let seed=0;seed<20;seed++){
   const q=makeRagQuestion(seed,1);
   expect(q.key).toContain(String(seed));
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.explanation).not.toContain('undefined');
   expect(q.answer).toMatch(/^\d+$/);
  }
 });
});

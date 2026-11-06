import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragProportionalPurchaseCost';
import type {Question} from '../generate';

/** Independent solver: reads only the visible context and prompt. */
function solve(q:Question):string{
 const ctx=q.context??[];
 if(ctx.length===3){
  const size=Number(/holds (\d+)/.exec(ctx[0])![1]);
  const priceCents=Math.round(Number(/\$(\d+\.\d{2})/.exec(ctx[1])![1])*100);
  const packs=Number(/buys (\d+) /.exec(ctx[2])![1]);
  return (size*packs*priceCents/100).toFixed(2);
 }
 const m1=/(\d+) for \$(\d+)/.exec(ctx[0])!,m2=/(\d+) for \$(\d+)/.exec(ctx[1])!;
 const a=Number(m1[1]),p1=Number(m1[2]),b=Number(m2[1]),p2=Number(m2[2]);
 const q2=Number(/as (\d+) /.exec(q.prompt)![1]);
 const numer=q2*p2*a,denom=b*p1;
 expect(q2%b).toBe(0);
 expect(numer%denom).toBe(0);
 return String(numer/denom);
}

describe('RAG proportional purchase cost',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-proportional-purchase-cost');
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('matches an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.answer).toBe(solve(q));
  }
 });

 it('uses both variants and keeps givens within sensible bounds',()=>{
  let groups=0,bundles=0;
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),ctx=q.context!;
   if(ctx.length===3){
    groups++;
    const total=Number(q.answer);
    expect(q.unit).toBe('dollars');
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(1500);
    expect(q.answer).toMatch(/^\d+\.\d{2}$/);
   }else{
    bundles++;
    const a=Number(/(\d+) for/.exec(ctx[0])![1]),p1=Number(/\$(\d+)/.exec(ctx[0])![1]);
    const b=Number(/(\d+) for/.exec(ctx[1])![1]),p2=Number(/\$(\d+)/.exec(ctx[1])![1]);
    const q2=Number(/as (\d+) /.exec(q.prompt)![1]);
    expect(p1*b).not.toBe(p2*a);
    expect(Number(q.answer)).not.toBe(q2);
    expect(Number.isInteger(Number(q.answer))).toBe(true);
   }
  }
  expect(groups).toBeGreaterThan(0);
  expect(bundles).toBeGreaterThan(0);
 });

 it('is deterministic and varied, with hint and worked steps',()=>{
  expect(makeRagQuestion(7,3)).toEqual(makeRagQuestion(7,3));
  const prompts=new Set<string>(),keys=new Set<string>();
  for(let seed=1;seed<=30;seed++){
   const q=makeRagQuestion(seed,0);
   prompts.add(JSON.stringify([q.context,q.prompt]));
   keys.add(q.key);
   expect(q.hint.length).toBeGreaterThan(0);
   expect(q.explanation.length).toBeGreaterThan(0);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
  }
  expect(prompts.size).toBeGreaterThan(10);
  expect(keys.size).toBe(30);
 });
});

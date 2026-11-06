import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragPricesCommonUnits';

/** Solves from visible context and prompt only; never reads q.answer or generation parameters. */
function solveVisible(q:{context?:string[];prompt:string}):{kind:string;cents:number}{
 const text=(q.context??[]).join(' ');
 const cents=(s:string)=>Math.round(Number(s)*100);
 let m=/^What was the cost of 1 kg of (\w+)\?$/.exec(q.prompt);
 if(m){
  const eq=/(\d+) kg of (\w+) cost as much as (\d+) kg of (\w+)\./.exec(text);
  const buy=/for (\d+) kg of (\w+) and (\d+) kg of (\w+)\./.exec(text);
  const paid=/\$(\d+\.\d\d)/.exec(text);
  if(!eq||!buy||!paid)throw new Error('unparsed equal-cost question');
  const a=Number(eq[1]),nameA=eq[2],b=Number(eq[3]),nameB=eq[4];
  expect(buy[2]).toBe(nameA);expect(buy[4]).toBe(nameB);
  const x=Number(buy[1]),y=Number(buy[3]),units=x*b+y*a,total=cents(paid[1]);
  expect(total%units).toBe(0);
  const unit=total/units;
  // a kg of A costs the same as b kg of B: A is b units per kg, B is a units per kg.
  return {kind:'equal-cost',cents:(m[1]===nameA?b:a)*unit};
 }
 m=/^What is the cost of one (\w+)\?$/.exec(q.prompt);
 if(m){
  const rel=/A (\w+) costs (\d+) times as much as a (\w+)\./.exec(text);
  const buy=/The cost of (\d+) (\w+) and (\d+) (\w+) was \$(\d+\.\d\d)\./.exec(text);
  if(!rel||!buy)throw new Error('unparsed multiple question');
  const k=Number(rel[2]),n=Number(buy[1]),mm=Number(buy[3]),units=n*k+mm,total=cents(buy[5]);
  expect(m[1]).toBe(rel[3]);
  expect(total%units).toBe(0);
  return {kind:'multiple',cents:total/units};
 }
 m=/^How much more does a (\w+) cost than a (\w+)\?$/.exec(q.prompt);
 if(m){
  const rel=/A (\w+) costs (\d+) times as much as a (\w+)\./.exec(text);
  const buy=/spent \$(\d+\.\d\d) on (\d+) (\w+) and (\d+) (\w+)\./.exec(text);
  if(!rel||!buy)throw new Error('unparsed difference question');
  const k=Number(rel[2]),n=Number(buy[2]),total=cents(buy[1]);
  expect(Number(buy[4])).toBe(n);
  const units=n*(k+1);
  expect(total%units).toBe(0);
  return {kind:'difference',cents:(k-1)*(total/units)};
 }
 throw new Error(`Unknown prompt ${q.prompt}`);
}

describe('p6 prices in common units',()=>{
 it('exports matching metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-prices-in-common-units');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('matches an independent solution from visible givens across seeds and indexes',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=120;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   const solved=solveVisible(q);
   kinds.add(solved.kind);
   expect(solved.cents).toBeGreaterThan(0);
   expect(Number(q.answer)).toBeCloseTo(solved.cents/100,6);
   expect(q.answer).toMatch(/^\d+\.\d\d$/);
   expect(q.unit).toBe('dollars');
  }
  expect([...kinds].sort()).toEqual(['difference','equal-cost','multiple']);
 });

 it('is deterministic and has explicit hint and worked steps',()=>{
  for(let seed=1;seed<=30;seed++){
   const a=makeRagQuestion(seed,1),b=makeRagQuestion(seed,1);
   expect(a).toEqual(b);
   expect(a.hint.length).toBeGreaterThan(10);
   expect(a.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(a.picture).toBeUndefined();
   expect(a.context?.length).toBe(2);
  }
 });

 it('produces varied questions',()=>{
  const prompts=new Set<string>();
  for(let seed=1;seed<=60;seed++){const q=makeRagQuestion(seed,0);prompts.add(JSON.stringify([q.context,q.prompt,q.answer]));}
  expect(prompts.size).toBeGreaterThan(40);
 });
});

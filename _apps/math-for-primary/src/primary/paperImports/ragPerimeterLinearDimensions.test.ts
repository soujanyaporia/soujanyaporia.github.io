import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragPerimeterLinearDimensions';

const givens=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
const grab=(t:string,re:RegExp)=>{const m=re.exec(t);if(!m)throw new Error(`Missing given: ${re} in ${t}`);return Number(m[1]);};

/** Solves from the visible wording only; never reads q.answer. */
function solve(q:Question):{variant:string;value:number}{
 const t=givens(q);
 if(t.includes('The stage has a perimeter of')){
  const stage=grab(t,/The stage has a perimeter of (\d+) m/),unshaded=grab(t,/unshaded part of the hall has a perimeter of (\d+) m/);
  const side=(unshaded-stage)/2,radius=side/2;
  return {variant:'semicircle',value:0.5*(22/7)*radius*radius};
 }
 if(t.includes('rectangles B and C')){
  const perimeter=grab(t,/total perimeter of rectangles B and C is (\d+) cm/),areaA=grab(t,/area of square A is (\d+) cm²/);
  const big=perimeter/4,a=Math.round(Math.sqrt(areaA)),d=big-a;
  return {variant:'partition',value:d*d};
 }
 if(t.includes('A rectangle has perimeter')){
  const areaSq=grab(t,/A square has area (\d+) cm²/),perimeter=grab(t,/A rectangle has perimeter (\d+) cm/);
  const diff=Math.round(Math.sqrt(areaSq));
  const found:number[]=[];
  for(let width=1;width<=200;width++){const length=width+diff;if(2*(width+length)===perimeter)found.push(length);}
  expect(found.length).toBe(1);
  return {variant:'rectangle',value:found[0]};
 }
 const more=grab(t,/is (\d+) cm more than the perimeter/),total=grab(t,/total perimeter of the two squares is (\d+) cm/);
 const found:number[]=[];
 for(let a=1;a<=300;a++)for(let b=1;b<=300;b++)if(4*b-4*a===more&&4*a+4*b===total)found.push(a);
 expect(found.length).toBe(1);
 return {variant:'two-squares',value:found[0]};
}

describe('perimeter linear dimension equations',()=>{
 it('answers agree with an independent solution from visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),solved=solve(q);
   expect(Math.abs(solved.value-Number(q.answer))).toBeLessThan(1e-9);
  }
 });

 it('covers all four variants deterministically and keeps answers positive whole numbers',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),again=makeRagQuestion(seed,index);
   expect(again).toEqual(q);
   seen.add(solve(q).variant);
   const n=Number(q.answer);
   expect(Number.isInteger(n)).toBe(true);
   expect(n).toBeGreaterThan(0);
   expect(q.unit).toBeTruthy();
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
   expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(3);
  }
  expect(seen.size).toBe(4);
 });

 it('uses unique keys and valid metadata',()=>{
  const keys=new Set<string>();
  for(let seed=1;seed<=10;seed++)for(let index=0;index<4;index++)keys.add(makeRagQuestion(seed,index).key);
  expect(keys.size).toBe(40);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId.startsWith('p6-')).toBe(true);
  expect(RAG_PATTERN.skillIds.every(id=>id.startsWith('P6.S.'))).toBe(true);
 });
});

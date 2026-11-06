import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragPerimeterDifferenceCancellation';
import type {Question} from '../generate';

const num=(text:string,re:RegExp):number=>{const m=re.exec(text);if(!m)throw new Error(`Missing given: ${re}`);return Number(m[1]);};

/** Solves from the visible givens only (context and prompt), by a different route from the generator. */
function solveVisible(q:Question):{answer:number;variant:'curve'|'side'|'area'}{
 const text=[...(q.context??[]),q.prompt].join(' ');
 const s=num(text,/sides of (\d+) cm/);
 if(/curved line/.test(text)){
  const rtMatch=/\bRT = (\d+) cm/.exec(text),stMatch=/\bST = (\d+) cm/.exec(text);
  const rt=rtMatch?Number(rtMatch[1]):s-Number(stMatch![1]);
  const st=stMatch?Number(stMatch[1]):s-rt;
  const x=s+st,y=s+s+rt;
  return {answer:y-x,variant:'curve'};
 }
 const w=num(text,/NP = (\d+) cm/),d=num(text,/is (\d+) cm longer/);
 const h=(4*s-d)/2-w;
 if(/shaded/.test(text)){
  // N=(0,0), P=(-w,0), R=(0,h), L=(s,s): triangle area by cross product.
  const cross=w*s-h*(s+w);
  return {answer:Math.abs(cross)/2,variant:'area'};
 }
 return {answer:h,variant:'side'};
}

describe('p5 perimeter difference by cancellation',()=>{
 it('has valid pattern metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-perimeter-difference-cancellation');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P[3-6]\.S\.[A-Z]+\.\d{2}$/);
 });

 it('matches an independent solution of the visible givens across seeds and indexes',()=>{
  for(let seed=1;seed<=80;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),solved=solveVisible(q);
   expect(Number(q.answer)).toBe(solved.answer);
   expect(Number.isInteger(solved.answer)&&solved.answer>0).toBe(true);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
  }
 });

 it('uses all three variants within any three consecutive indexes',()=>{
  for(const seed of [3,10,41]){
   const kinds=new Set([0,1,2].map(i=>solveVisible(makeRagQuestion(seed,i)).variant));
   expect(kinds.size).toBe(3);
  }
 });

 it('keeps joined-figure givens geometrically consistent',()=>{
  for(let seed=1;seed<=120;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),text=[...(q.context??[]),q.prompt].join(' ');
   if(/curved line/.test(text)){
    const s=num(text,/sides of (\d+) cm/),rt=/\bRT = (\d+) cm/.exec(text),st=/\bST = (\d+) cm/.exec(text);
    const given=Number((rt??st)![1]);
    expect(given).toBeGreaterThan(0);expect(given).toBeLessThan(s);
   }else{
    const s=num(text,/sides of (\d+) cm/),w=num(text,/NP = (\d+) cm/),d=num(text,/is (\d+) cm longer/);
    const h=(4*s-d)/2-w;
    expect(d).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);expect(h).toBeLessThan(s);
    expect(w).toBeLessThanOrEqual(s/2);
    expect(h*(s+w)).toBeGreaterThan(s*w); // R lies inside triangle PKL
   }
  }
 });

 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const seen=new Set<string>();
  for(let seed=1;seed<=30;seed++)for(let index=0;index<3;index++){const q=makeRagQuestion(seed,index);seen.add(JSON.stringify([q.prompt,q.context]));}
  expect(seen.size).toBeGreaterThanOrEqual(40);
 });

 it('has a unit, hint, steps ending in the answer, no picture and no copied source labels',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),all=JSON.stringify(q);
   expect(q.unit).toMatch(/^cm²?$/);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.picture).toBeUndefined();
   const last=q.workedSteps![q.workedSteps!.length-1];
   expect(last.equation).toContain(`= ${q.answer}`);
   expect(all).not.toMatch(/sgexam|Raffles|Rosyth|ABCD|DEFG|ABCE/);
  }
 });
});

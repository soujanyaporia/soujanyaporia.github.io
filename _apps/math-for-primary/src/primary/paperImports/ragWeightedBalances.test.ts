import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragWeightedBalances';

const ints=(text:string):number[]=>(text.match(/\d+/g)??[]).map(Number);
const fractions=(text:string):[number,number][]=>(text.match(/\d+\/\d+/g)??[]).map(f=>{const [a='0',b='1']=f.split('/');return [Number(a),Number(b)] as [number,number];});
const first=(values:number[]):number=>values[0]??0;
const frac=(values:[number,number][],i:number):[number,number]=>values[i]??[0,1];

/** Solve only from the visible context; return every whole-number solution found. */
function solveFromGivens(q:Question):number[]{
 const [c0='',c1='',c2='']=q.context??[];
 const found:number[]=[];
 if(c0.startsWith('Stall P')){
  const total=first(ints(c0)),diff=first(ints(c2)),fr=fractions(c1),[a1,b1]=frac(fr,0),[a2,b2]=frac(fr,1);
  for(let x=1;x<total;x++){
   const y=total-x;
   if(x%b1!==0||y%b2!==0)continue;
   if(y/b2*(b2-a2)-x/b1*(b1-a1)===diff)found.push(x);
  }
 }else if(c0.startsWith('Shop R')){
  const diff=first(ints(c0)),left=first(ints(c2)),fr=fractions(c1),[a1,b1]=frac(fr,0),[a2,b2]=frac(fr,1);
  for(let red=diff+1;red<=6000;red++){
   const blue=red-diff;
   if(red%b1!==0||blue%b2!==0)continue;
   if(red/b1*(b1-a1)+blue/b2*(b2-a2)===left)found.push(red);
  }
 }else{
  const [m=0,n=0]=ints(c1),[a,b]=frac(fractions(c2),0);
  for(let x=m+1;x<=6000;x++)if(b*(x-m)===a*(x+n))found.push(x);
 }
 return found;
}

describe('RAG weighted balances with initial constraints',()=>{
 it('has valid pattern metadata',()=>{
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-weighted-balances-initial-constraints');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('has exactly one whole-number solution from the visible givens that matches the answer',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   expect(solveFromGivens(q)).toEqual([Number(q.answer)]);
  }
 });

 it('uses all three variants and names the asked quantity in the prompt',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=10;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),c0=(q.context??[])[0]??'';
   if(c0.startsWith('Stall P')){kinds.add('total');expect(q.prompt).toContain('Stall P');}
   else if(c0.startsWith('Shop R')){kinds.add('difference');expect(q.prompt).toContain('Shop R');}
   else{kinds.add('equal');expect(q.prompt).toContain('each child');}
  }
  expect(kinds.size).toBe(3);
 });

 it('is deterministic and varied across seeds',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const seen=new Set<string>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   seen.add(JSON.stringify([q.context,q.prompt]));
  }
  expect(seen.size).toBeGreaterThanOrEqual(60);
 });

 it('gives an entry answer, a unit, a hint and meaningful worked steps ending in the answer',()=>{
  for(let seed=1;seed<=30;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index),steps=q.workedSteps??[];
   expect(q.choices).toBeUndefined();
   expect(q.unit).toBeTruthy();
   expect(q.hint.length).toBeGreaterThan(10);
   expect(Number.isInteger(Number(q.answer))).toBe(true);
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(steps.length).toBeGreaterThanOrEqual(5);
   expect(steps.every(s=>s.text.length>0&&!!s.equation)).toBe(true);
   expect(steps[steps.length-1]?.equation).toContain(`= ${q.answer}`);
  }
 });
});

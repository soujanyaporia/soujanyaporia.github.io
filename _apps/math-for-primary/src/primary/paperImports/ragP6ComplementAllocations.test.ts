import {describe,expect,it} from 'vitest';
import {correctAnswer,type Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragP6ComplementAllocations';

type Frac=[number,number];
const g=(a:number,b:number):number=>b?g(b,a%b):a;
const addFrac=(a:Frac,b:Frac):Frac=>{const n=a[0]*b[1]+b[0]*a[1],d=a[1]*b[1],k=g(n,d);return [n/k,d/k];};

/** Solves only from the visible context and prompt, never from the stored answer. */
function parse(q:Question){
 const text=(q.context??[]).join(' ');
 const fracs=[...text.matchAll(/(\d+)\/(\d+)/g)].map(m=>[Number(m[1]),Number(m[2])] as Frac);
 const ints=[...text.replace(/\d+\/\d+/g,' ').matchAll(/\d+/g)].map(m=>Number(m[0]));
 let used:Frac=[0,1];for(const f of fracs)used=addFrac(used,f);
 const k=g(used[1]-used[0],used[1]);
 const rest:Frac=[(used[1]-used[0])/k,used[1]/k];
 const kind=q.prompt.startsWith('How many')?'quantity':/\beach\b/.test(q.prompt)?(fracs.length===1?'share-one':'share-two'):'fraction';
 return {fracs,ints,used,rest,kind};
}
function solve(q:Question):string{
 const {ints,rest,kind}=parse(q);
 if(kind==='quantity'){const v=ints[0]*rest[0]/rest[1];expect(Number.isInteger(v)).toBe(true);return String(v);}
 if(kind==='share-one'||kind==='share-two'){const n=rest[0],d=rest[1]*ints[0],k=g(n,d);return `${n/k}/${d/k}`;}
 return `${rest[0]}/${rest[1]}`;
}

describe('p6 complement of whole-based allocations',()=>{
 it('declares matching metadata',()=>{
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-complement-of-whole-based-allocations');
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });
 it('matches an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.answer,JSON.stringify(q.context)+q.prompt).toBe(solve(q));
   expect(correctAnswer(q,q.answer)).toBe(true);
  }
 });
 it('uses all four variants in a run of consecutive indices',()=>{
  for(let seed=1;seed<=20;seed++){
   const kinds=new Set([0,1,2,3].map(i=>parse(makeRagQuestion(seed,i)).kind));
   expect(kinds).toEqual(new Set(['fraction','quantity','share-one','share-two']));
  }
 });
 it('keeps givens grade-appropriate and valid',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),{fracs,used,kind}=parse(q);
   for(const [n,d] of fracs){expect(n).toBeGreaterThan(0);expect(n).toBeLessThan(d);expect(d).toBeLessThanOrEqual(12);expect(g(n,d)).toBe(1);}
   expect(used[0]).toBeLessThan(used[1]);
   if(kind==='quantity'){expect(q.unit).toBeTruthy();expect(Number(q.answer)).toBeGreaterThan(0);}
   else{
    const m=/^(\d+)\/(\d+)$/.exec(q.answer);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThan(Number(m![2]));
    expect(g(Number(m![1]),Number(m![2]))).toBe(1);
    expect(q.requireSimplified).toBe(true);
   }
   if(kind==='fraction'||kind==='share-two')expect(new Set(fracs.map(f=>f[1])).size).toBe(2);
  }
 });
 it('rejects an unsimplified equivalent fraction and accepts the exact answer',()=>{
  for(let seed=1;seed<=20;seed++)for(const index of [0,2,3]){
   const q=makeRagQuestion(seed,index),[n,d]=q.answer.split('/').map(Number);
   expect(correctAnswer(q,`${2*n}/${2*d}`)).toBe(false);
   expect(correctAnswer(q,q.answer)).toBe(true);
  }
 });
 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(7,3)).toEqual(makeRagQuestion(7,3));
  const prompts=new Set<string>();
  for(let seed=1;seed<=40;seed++){const q=makeRagQuestion(seed,1);prompts.add(JSON.stringify([q.context,q.prompt]));}
  expect(prompts.size).toBeGreaterThan(20);
 });
 it('includes hints and worked steps without source names',()=>{
  for(let seed=1;seed<=30;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
   const all=JSON.stringify(q);
   for(const banned of ['David','Gregory','Rani','Fatimah','toy cars','chocolate bar'])expect(all).not.toContain(banned);
  }
 });
});

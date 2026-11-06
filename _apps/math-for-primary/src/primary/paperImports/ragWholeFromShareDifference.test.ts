import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragWholeFromShareDifference';

type R={n:number;d:number};
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
const q=(n:number,d=1):R=>{const g=gcd(n,d)||1;return {n:n/g,d:d/g};};
const minus=(a:R,b:R)=>q(a.n*b.d-b.n*a.d,a.d*b.d);
const times=(a:R,b:R)=>q(a.n*b.n,a.d*b.d);
const num=(a:R)=>a.n/a.d;
const ONE=q(1);
const wholeFromGap=(gap:number,f:R)=>{expect(f.n).toBeGreaterThan(0);return gap*f.d/f.n;};

/** Solves from the visible context lines only. Returns the answer and the variant label. */
function solve(context:string[]):{variant:string;answer:number;shares:number[]}{
 if(/shared the cost/.test(context[0])){
  const k=Number(/paid 1\/(\d+) of the total/.exec(context[1])![1]);
  const [,p,den]=/paid (\d+)\/(\d+) of the whole/.exec(context[2])!.map(Number);
  const d=Number(/\$(\d+) more/.exec(context[3])![1]);
  const a=q(1,k+1),b=q(p,den),c=minus(minus(ONE,a),b);
  const total=wholeFromGap(d,minus(c,a));
  return {variant:'cost',answer:total,shares:[num(a),num(b),num(c)].map(f=>f*total)};
 }
 if(/sold some/.test(context[0])){
  const names=/^(\w+), (\w+) and (\w+) sold some/.exec(context[0])!.slice(1);
  const n=Number(/sold 1\/(\d+) of all/.exec(context[1])![1]);
  const [,a,b]=/in the ratio (\d+) : (\d+)/.exec(context[2])!.map(Number);
  const [,who,d]=/^(\w+) sold (\d+) more/.exec(context[3])!;
  const first=q(1,n),part=who===names[1]?a:b,share=times(minus(ONE,first),q(part,a+b));
  const total=wholeFromGap(Number(d),minus(share,first));
  return {variant:'ratio',answer:total,shares:[num(first),num(times(minus(ONE,first),q(a,a+b))),num(times(minus(ONE,first),q(b,a+b)))].map(f=>f*total)};
 }
 if(/has read/.test(context[0])){
  const a=Number(/read 1\/(\d+) of/.exec(context[0])![1]);
  const [,d,p,den]=/After reading (\d+) more pages, the pages \w+ has read are (\d+)\/(\d+) of/.exec(context[1])!.map(Number);
  const after=q(p,p+den),total=wholeFromGap(d,minus(after,q(1,a)));
  return {variant:'pages',answer:total*num(after),shares:[total/a,total*num(after)]};
 }
 const a=Number(/Box 1 got 1\/(\d+) of all/.exec(context[1])![1]);
 const [,p,den]=/^Box 2 got (\d+)\/(\d+) of/.exec(context[2])!.map(Number);
 const d=Number(/^Box 2 got (\d+) more/.exec(context[4])![1]);
 const first=q(1,a),rest=minus(ONE,first),second=times(rest,q(p,den)),third=times(rest,minus(ONE,q(p,den)));
 const total=wholeFromGap(d,minus(second,first));
 return {variant:'boxes',answer:total*num(third),shares:[total*num(first),total*num(second),total*num(third)]};
}

describe('p6 whole from a difference between shares',()=>{
 it('exports metadata that matches the pattern',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-whole-from-difference-between-shares');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P\d\.S\.[A-Z]+\.\d{2}$/);
 });

 it('answers agree with an independent solution of the visible givens',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const question=makeRagQuestion(seed,index);
   const solved=solve(question.context!);
   seen.add(solved.variant);
   expect(Number(question.answer)).toBe(solved.answer);
   expect(Number.isInteger(solved.answer)).toBe(true);
   expect(solved.answer).toBeGreaterThan(0);
   for(const share of solved.shares)expect(Number.isInteger(Math.round(share*1e6)/1e6)).toBe(true);
  }
  expect(seen.size).toBe(4);
 });

 it('keeps every given difference positive and whole',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const question=makeRagQuestion(seed,index);
   const text=question.context!.join(' ');
   const gaps=[...text.matchAll(/(?:\$|sold |After reading |Box 2 got )(\d+)(?: more)/g)].map(m=>Number(m[1]));
   expect(gaps.length).toBeGreaterThan(0);
   for(const g of gaps)expect(g).toBeGreaterThan(0);
  }
 });

 it('is deterministic, varies with the seed and includes teaching support',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set<string>();
  for(let seed=1;seed<=30;seed++){
   const question=makeRagQuestion(seed,1);
   prompts.add(JSON.stringify(question.context));
   expect(question.unit).toBeTruthy();
   expect(question.hint.length).toBeGreaterThan(10);
   expect(question.explanation).not.toMatch(/undefined|NaN/);
   expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(question.picture).toBeUndefined();
  }
  expect(prompts.size).toBeGreaterThan(10);
 });
});

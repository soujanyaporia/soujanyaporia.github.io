import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragP4FractionShareGap';

type R=[number,number];
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const norm=(x:R):R=>{const k=gcd(Math.abs(x[0]),x[1]);return [x[0]/k,x[1]/k];};
const sub=(a:R,b:R):R=>norm([a[0]*b[1]-b[0]*a[1],a[1]*b[1]]);
const one:R=[1,1];

// Independent solver: reads only the visible context lines and the prompt.
function solve(q:Question){
 const ctx=q.context!;
 const shares=new Map<string,R>();
 const t=/^(\d+)\/(\d+) of the (.+?) were ([a-z ]+), (\d+)\/(\d+) of the .+? were ([a-z ]+) and the rest were ([a-z ]+)\.$/.exec(ctx[1]);
 const w=/^(\d+)\/(\d+) of the (.+?) were ([a-z ]+)\. The rest were ([a-z ]+)\.$/.exec(ctx[1]);
 let kind:'three'|'two',stated:R[];
 if(t){
  const a:R=[Number(t[1]),Number(t[2])],b:R=[Number(t[5]),Number(t[6])];
  shares.set(t[4],a);shares.set(t[7],b);shares.set(t[8],sub(sub(one,a),b));kind='three';stated=[a,b];
 }else if(w){
  const a:R=[Number(w[1]),Number(w[2])];
  shares.set(w[4],a);shares.set(w[5],sub(one,a));kind='two';stated=[a];
 }else throw new Error('unparsed share line: '+ctx[1]);
 const g=/^There were (\d+) more ([a-z ]+) than ([a-z ]+)\.$/.exec(ctx[2]);
 if(!g)throw new Error('unparsed gap line: '+ctx[2]);
 const count=Number(g[1]),gapShare=sub(shares.get(g[2])!,shares.get(g[3])!);
 expect(gapShare[0]).toBeGreaterThan(0);
 const wholeNum=count*gapShare[1];
 expect(wholeNum%gapShare[0]).toBe(0);
 const whole=wholeNum/gapShare[0];
 if(/altogether\?$/.test(q.prompt))return {answer:whole,kind,whole:true,stated,shares,gapNames:[g[2],g[3]]};
 const p=/^How many ([a-z ]+) were there\?$/.exec(q.prompt);
 if(!p)throw new Error('unparsed prompt: '+q.prompt);
 const share=shares.get(p[1])!;
 expect(share).toBeDefined();
 const value=whole*share[0];
 expect(value%share[1]).toBe(0);
 return {answer:value/share[1],kind,whole:false,stated,shares,gapNames:[g[2],g[3]]};
}

const seeds=[1,2,3,7,11,42,2026];

describe('RAG_PATTERN',()=>{
 it('has the required metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(4);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p4-fraction-share-gap-to-count');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  expect(JSON.stringify(RAG_PATTERN)).not.toMatch(/sgexam|Raffles|Henry Park|Rosyth/i);
 });
});

describe('makeRagQuestion',()=>{
 it('matches an independent solution from the visible givens',()=>{
  for(const seed of seeds)for(let index=0;index<48;index++){
   const q=makeRagQuestion(seed,index),s=solve(q);
   expect(Number.isInteger(s.answer)).toBe(true);
   expect(s.answer).toBeGreaterThan(0);
   expect(q.answer).toBe(String(s.answer));
  }
 });
 it('keeps stated fractions within P4 limits and shares positive',()=>{
  for(const seed of seeds)for(let index=0;index<48;index++){
   const s=solve(makeRagQuestion(seed,index));
   for(const [n,d] of s.stated){expect(d).toBeLessThanOrEqual(12);expect(n).toBeLessThan(d);expect(n).toBeGreaterThan(0);}
   for(const v of s.shares.values())expect(v[0]).toBeGreaterThan(0);
   expect(new Set(s.gapNames).size).toBe(2);
  }
 });
 it('covers all four variants',()=>{
  const seen=new Set<string>();
  for(const seed of seeds)for(let index=0;index<16;index++){const s=solve(makeRagQuestion(seed,index));seen.add(`${s.kind}-${s.whole?'whole':'target'}`);}
  expect([...seen].sort()).toEqual(['three-target','three-whole','two-target','two-whole']);
 });
 it('has worked steps ending in the answer',()=>{
  for(let index=0;index<24;index++){
   const q=makeRagQuestion(5,index),last=q.workedSteps![q.workedSteps!.length-1];
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
   expect(last.equation!.endsWith(`= ${q.answer}`)).toBe(true);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.unit).toBeTruthy();
  }
 });
 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(9,3)).toEqual(makeRagQuestion(9,3));
  const prompts=new Set<string>();
  for(let index=0;index<40;index++){const q=makeRagQuestion(13,index);prompts.add(JSON.stringify([q.prompt,q.context]));}
  expect(prompts.size).toBeGreaterThanOrEqual(35);
  expect(makeRagQuestion(4,0).key).not.toBe(makeRagQuestion(4,1).key);
 });
});

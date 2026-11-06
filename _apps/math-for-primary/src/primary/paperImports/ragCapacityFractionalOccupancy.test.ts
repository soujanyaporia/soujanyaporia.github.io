import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragCapacityFractionalOccupancy';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';

type Solved={kind:'removal'|'two-tanks'|'added'|'jug';answer:string};

/** Solves from the visible context only; it never reads the stored answer or private generation parameters. */
function solveVisible(q:Question):Solved{
 const text=(q.context??[]).join(' ');
 let hit:RegExpExecArray|null;
 if((hit=/base (\d+) cm by (\d+) cm[\s\S]*?depth of (\d+) cm[\s\S]*?Then (\d+) litres[\s\S]*?to (\d+)\/(\d+) of the height/.exec(text))){
  const [L,W,d0,removed,n,m]=hit.slice(1).map(Number),area=L*W,left=area*d0-removed*1000;
  return {kind:'removal',answer:String(left*m/(n*1000))};
 }
 if((hit=/Tank M is a rectangular tank (\d+) cm long, (\d+) cm wide and (\d+) cm high\. It is (\d+)\/(\d+) full of water\.[\s\S]*?Tank N is (\d+)\/(\d+) full of water\.[\s\S]*?then (\d+)\/(\d+) full\.[\s\S]*?base area of Tank N is (\d+) cm²/.exec(text))){
  const [a,b,c,p,q,s,t,s2,t2,A]=hit.slice(1).map(Number),volume=a*b*c*p/q,capacity=volume*(t*t2)/(s2*t-s*t2);
  return {kind:'two-tanks',answer:JSON.stringify([String(volume),String(capacity/A)])};
 }
 if((hit=/A tank is (\d+)\/(\d+) full of water\. Then (\d+) litres of water are poured in\. The tank is now (\d+)\/(\d+) full\./.exec(text))){
  const [s,t,x,s2,t2]=hit.slice(1).map(Number);
  return {kind:'added',answer:String(x*t*t2/(s2*t-s*t2))};
 }
 if((hit=/A (.+?) is (\d+)\/(\d+) full of water\.[\s\S]*?capacity of the (.+?) is (\d+) times[\s\S]*?There are (\d+) ml of water/.exec(text))){
  const p=Number(hit[2]),q=Number(hit[3]),k=Number(hit[5]),w=Number(hit[6]),small=w*q/p;
  return {kind:'jug',answer:String(small*k-w)};
 }
 throw new Error(`Unrecognised question: ${text}`);
}

const samples:Question[]=[];
for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++)samples.push(makeRagQuestion(seed,index));

describe('capacity from fractional occupancy generator',()=>{
 it('exports consistent metadata with real curriculum skill IDs',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-capacity-from-fractional-occupancy');
  const known=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(known.has(id)).toBe(true);
 });

 it('matches an independent solution from the visible givens',()=>{
  for(const q of samples){
   const solved=solveVisible(q);
   expect(q.answer).toBe(solved.answer);
   const numbers=solved.kind==='two-tanks'?(JSON.parse(solved.answer) as string[]).map(Number):[Number(solved.answer)];
   for(const n of numbers){expect(Number.isInteger(n)).toBe(true);expect(n).toBeGreaterThan(0);}
  }
 });

 it('uses all four variants and deterministic output',()=>{
  const kinds=new Set(samples.map(q=>solveVisible(q).kind));
  expect([...kinds].sort()).toEqual(['added','jug','removal','two-tanks']);
  expect(makeRagQuestion(7,3)).toEqual(makeRagQuestion(7,3));
  expect(new Set(samples.map(q=>JSON.stringify([q.context,q.prompt]))).size).toBeGreaterThan(120);
 });

 it('keeps response formats and worked steps complete',()=>{
  for(const q of samples){
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.picture).toBeUndefined();
   if(solveVisible(q).kind==='two-tanks'){
    expect(q.structuredResponse?.kind).toBe('number-fields');
    expect(structuredResponseCorrect(q.structuredResponse!,q.answer,q.answer)).toBe(true);
    const [a,b]=JSON.parse(q.answer) as string[];
    expect(structuredResponseCorrect(q.structuredResponse!,q.answer,JSON.stringify([a,String(Number(b)+1)]))).toBe(false);
   }else{
    expect(q.structuredResponse).toBeUndefined();
    expect(q.unit).toBeTruthy();
   }
  }
 });

 it('does not reuse the exact source givens',()=>{
  for(const q of samples){
   const text=(q.context??[]).join(' ');
   expect(/base 125 cm by 60 cm[\s\S]*depth of 14 cm[\s\S]*2\/5 of the height/.test(text)).toBe(false);
   expect(/is 1\/3 full of water[\s\S]*is 4 times[\s\S]*There are 10 ml/.test(text)).toBe(false);
  }
 });
});

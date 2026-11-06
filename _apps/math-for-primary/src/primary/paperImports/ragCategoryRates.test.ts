import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragCategoryRates';

const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const cents=(s:string)=>[...s.matchAll(/\$(\d+(?:\.\d+)?)/g)].map(m=>Math.round(Number(m[1])*100));

/** Solves only from the visible context and prompt text. */
function solve(q:{context?:string[];prompt:string}):{kind:string;answer:number;ages?:number[];tieTotal?:number}{
 const ctx=q.context??[],text=ctx.join('\n');
 if(text.includes('Cinema ticket prices')){
  const line=(p:string)=>ctx.find(l=>l.startsWith(p))!;
  const [adultWd,adultWe]=cents(line('Adult:')),[childWd,childWe]=cents(line('Child:')),[senior]=cents(line('Senior:'));
  const buy=ctx[ctx.length-1];
  const n=(w:string)=>Number(new RegExp(`(\\d+) ${w} tickets?`).exec(buy)![1]);
  const day=/for a (\w+) show/.exec(buy)![1];
  const weekend=day==='Saturday'||day==='Sunday';
  const total=n('adult')*(weekend?adultWe:adultWd)+n('senior')*senior+n('child')*(weekend?childWe:childWd);
  return {kind:'day',answer:total/100};
 }
 if(text.includes('A cruise charges')){
  const rooms=new Map<string,number[]>();
  for(const l of ctx){const m=/^(\w+) room: adult \$(\d+), child \$(\d+)$/.exec(l);if(m)rooms.set(m[1],[Number(m[2]),Number(m[3])]);}
  const room=/chooses the (\w+) room/.exec(q.prompt)![1];
  const [adult,child]=rooms.get(room)!;
  const ages=[...text.matchAll(/\(age (\d+)\)/g)].map(m=>Number(m[1]));
  const total=ages.reduce((s,a)=>s+(a<12?child:adult),0);
  return {kind:'age',answer:Math.round(total/100)*100,ages,tieTotal:total};
 }
 const wd=Number(/Monday to Friday: \$(\d+)/.exec(text)![1]),we=Number(/Saturday and Sunday: \$(\d+)/.exec(text)![1]);
 const m=/from the (\d+)\w*, a (\w+), to the (\d+)/.exec(text)!;
 let sum=0;
 for(let d=Number(m[1]),i=DAYS.indexOf(m[2]);d<=Number(m[3]);d++,i++)sum+=i%7>=5?we:wd;
 return {kind:'wage',answer:sum};
}

describe('p5 category rates generator',()=>{
 it('matches an independent solution from visible givens across seeds',()=>{
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),s=solve(q);
   expect(Number(q.answer)).toBeCloseTo(s.answer,6);
  }
 });
 it('uses all three variants deterministically',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=12;seed++)for(let index=0;index<3;index++)kinds.add(solve(makeRagQuestion(seed,index)).kind);
  expect([...kinds].sort()).toEqual(['age','day','wage']);
  expect(JSON.stringify(makeRagQuestion(7,2))).toBe(JSON.stringify(makeRagQuestion(7,2)));
 });
 it('keeps age questions unambiguous and free of rounding ties',()=>{
  let seen=0;
  for(let seed=1;seed<=60;seed++)for(let index=0;index<3;index++){
   const s=solve(makeRagQuestion(seed,index));
   if(s.kind!=='age')continue;
   seen++;
   expect(s.tieTotal!%100).not.toBe(50);
   expect(s.answer%100).toBe(0);
   expect(s.ages!.some(a=>a<12)).toBe(true);
   expect(s.ages!.some(a=>a>=12&&a<=16)).toBe(true);
  }
  expect(seen).toBeGreaterThan(10);
 });
 it('has varied questions, worked steps, hints and clean metadata',()=>{
  const prompts=new Set<string>();
  for(let seed=1;seed<=30;seed++){
   const q=makeRagQuestion(seed,0);
   prompts.add(JSON.stringify([q.context,q.prompt]));
   expect(q.unit).toBe('dollars');
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(JSON.stringify(q)).not.toMatch(/Langkawi|William|sgexam|Melissa|Gopal/i);
  }
  expect(prompts.size).toBeGreaterThan(20);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-category-rates-eligibility');
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.01','P5.S.RATE.02','P4.S.WN.02']);
 });
});

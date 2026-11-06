import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragDisplayedValueRatio';
import {correctAnswer} from '../generate';
import type {Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
const gcdAll=(v:number[])=>v.reduce(gcd,0);
const order=(prompt:string,re:RegExp)=>[...prompt.matchAll(re)].map(m=>m[1]);
const grams=(s:string)=>{
 let m=/^(\d+) g$/.exec(s);if(m)return Number(m[1]);
 m=/^(\d+)\/(\d+) kg$/.exec(s);if(m)return Number(m[1])*1000/Number(m[2]);
 m=/^(\d+(?:\.\d+)?) kg$/.exec(s);if(m)return Math.round(Number(m[1])*1000);
 throw new Error(`Unreadable mass ${s}`);
};

/** Independent solver: reads only the visible context, prompt and picture. */
function solve(q:Question):{kind:string;raw:number[]}{
 const ctx=q.context??[];
 const pic=q.picture as unknown as {type?:string;cards?:{label:string;value:string}[]}|undefined;
 if(pic?.type==='paper'&&pic.cards){
  const h=new Map(pic.cards.map(c=>[c.label,Number(/^(\d+) cm$/.exec(c.value)![1])]));
  return {kind:'table',raw:order(q.prompt,/(Plant [A-Z])/g).map(n=>h.get(n)!)};
 }
 if(ctx.some(l=>/ costs \$/.test(l))){
  const v=new Map<string,number>();
  for(const l of ctx){const m=/^The (.+) costs \$(\d+)\.(\d{2})\.$/.exec(l);if(m)v.set(m[1],Number(m[2])*100+Number(m[3]));}
  return {kind:'money',raw:order(q.prompt,/the cost of the ([a-z ]+?)(?= to the cost of|\.)/g).map(n=>v.get(n)!)};
 }
 if(ctx.some(l=>/^Ribbon/.test(l))){
  const v=new Map<string,number>();
  for(const l of ctx){const m=/^(Ribbon [A-C]) runs from the (\d+) cm mark to the (\d+) cm mark\.$/.exec(l);if(m)v.set(m[1],Number(m[3])-Number(m[2]));}
  return {kind:'ribbon',raw:order(q.prompt,/(Ribbon [A-C])/g).map(n=>v.get(n)!)};
 }
 const v=new Map<string,number>();
 for(const l of ctx){const m=/^The (.+) weighs (.+)\.$/.exec(l);if(m)v.set(m[1],grams(m[2]));}
 return {kind:'mass',raw:order(q.prompt,/the mass of the ([a-z ]+?)(?= to the mass of|\.)/g).map(n=>v.get(n)!)};
}

describe('p6 ratio from displayed values',()=>{
 it('has valid metadata',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-ratio-displayed-values');
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution from the visible givens across seeds and variants',()=>{
  const kinds=new Set<string>(),answers=new Set<string>(),keys=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),s=solve(q);
   kinds.add(s.kind);answers.add(q.answer);keys.add(q.key);
   expect(s.raw.length).toBe(3);
   expect(s.raw.every(n=>Number.isInteger(n)&&n>0)).toBe(true);
   // The displayed values always need simplifying.
   expect(gcdAll(s.raw)).toBeGreaterThan(1);
   const g=gcdAll(s.raw),expected=s.raw.map(n=>n/g);
   expect(gcdAll(expected)).toBe(1);
   expect((JSON.parse(q.answer) as string[]).map(Number)).toEqual(expected);
   expect(correctAnswer(q,JSON.stringify(expected.map(String)))).toBe(true);
   expect(correctAnswer(q,JSON.stringify(expected.map(n=>String(2*n))))).toBe(false);
   expect(q.structuredResponse?.kind).toBe('number-fields');
   if(q.structuredResponse?.kind==='number-fields')expect(q.structuredResponse.fields.length).toBe(3);
   expect(q.hint.length).toBeGreaterThan(0);
   expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(2);
   expect(q.prompt).not.toContain(expected.join(':'));
  }
  expect(kinds).toEqual(new Set(['money','table','ribbon','mass']));
  expect(answers.size).toBeGreaterThan(10);
  expect(keys.size).toBe(240);
 });

 it('shows mixed numerical forms in the mass variant',()=>{
  let checked=0;
  for(let seed=1;seed<=20;seed++){
   const q=makeRagQuestion(seed,3-(seed%4)+ (seed%4===0?0:0));
   const ctx=(q.context??[]);
   if(!ctx.some(l=>/weighs/.test(l)))continue;
   checked++;
   expect(ctx.filter(l=>/ g\.$/.test(l)).length).toBe(1);
   expect(ctx.filter(l=>/\d\/\d kg\.$/.test(l)).length).toBe(1);
   expect(ctx.filter(l=>/\d\.\d+ kg\.$/.test(l)).length).toBe(1);
  }
  expect(checked).toBeGreaterThan(0);
 });

 it('is deterministic for a seed and index',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  expect(makeRagQuestion(7,2).key).not.toBe(makeRagQuestion(7,3).key);
 });
});

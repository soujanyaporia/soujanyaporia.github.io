import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragP4SumsOfReadings';

interface Card{label:string;value:string}
interface Part{size:number;label:string}
interface Row{label:string;parts:Part[]}
interface Pic{type:string;layout?:string;cards?:Card[];rows?:Row[];labels?:string[];values?:number[]}
const pic=(q:Question)=>q.picture as unknown as Pic;
const nums=(s:string)=>(s.match(/\d+/g)??[]).map(Number);
const total=(s:string)=>nums(s).reduce((a,b)=>a+b,0);

/** Solve only from the visible prompt, choices and picture; never from q.answer. */
function solve(q:Question):string{
 const p=pic(q);
 if(p.type==='bars'){
  const values=p.values!,labels=p.labels!;
  const scored=(q.choices??[]).map(c=>{const [a,b]=c.split(' and ');return {c,s:values[labels.indexOf(a)]+values[labels.indexOf(b)]};});
  const min=Math.min(...scored.map(x=>x.s));
  expect(scored.filter(x=>x.s===min)).toHaveLength(1);
  // The offered minimum is also the minimum over all pairs of the five children.
  const sorted=[...values].sort((a,b)=>a-b);
  expect(min).toBe(sorted[0]+sorted[1]);
  return scored.find(x=>x.s===min)!.c;
 }
 if(p.layout==='bars'){
  const m=/number of (\w+) (\w+) and the number of (\w+) (\w+) that were made/.exec(q.prompt)!;
  const made=(kind:string)=>total(p.rows!.find(r=>r.label===kind)!.parts.map(x=>x.label).join(' '));
  return String(Math.abs(made(m[1])-made(m[3])));
 }
 if(q.prompt.includes(' says that ')){
  const m=/says that Team (\w+) scored more points than Team (\w+) altogether/.exec(q.prompt)!;
  const pts=(team:string)=>total(p.cards!.find(c=>c.label===`Team ${team}`)!.value);
  return pts(m[1])>pts(m[2])?'Yes':'No';
 }
 const totals=p.cards!.map(c=>({label:c.label,t:total(c.value)}));
 const top=Math.max(...totals.map(x=>x.t));
 expect(totals.filter(x=>x.t===top)).toHaveLength(1);
 return totals.find(x=>x.t===top)!.label;
}

const seeds=Array.from({length:40},(_,i)=>i*7+1);

describe('compare sums of readings',()=>{
 it('exposes consistent metadata without source text',()=>{
  expect(RAG_PATTERN.level).toBe(4);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p4-compare-sums-of-readings');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  expect(JSON.stringify(RAG_PATTERN)).not.toMatch(/sgexam|Nan Hua|Rosyth|Ralph/i);
 });

 it('solves every variant independently from the visible givens',()=>{
  for(const seed of seeds)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(solve(q)).toBe(q.answer);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(0);
   if(q.choices)expect(q.choices).toContain(q.answer);
  }
 });

 it('uses all four variants for consecutive indices and is deterministic',()=>{
  for(const seed of seeds.slice(0,10)){
   const kinds=new Set([0,1,2,3].map(i=>{const q=makeRagQuestion(seed,i),p=pic(q);return p.type==='bars'?'graph':p.layout==='bars'?'difference':q.prompt.includes(' says that ')?'judge':'greatest';}));
   expect(kinds.size).toBe(4);
   expect(makeRagQuestion(seed,2)).toEqual(makeRagQuestion(seed,2));
  }
 });

 it('keeps the intended traps and balanced answers',()=>{
  const answers=new Set<string>();
  for(const seed of seeds)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),p=pic(q);
   if(p.layout==='cards'&&!q.prompt.includes(' says that ')){
    // The winner is not simply the largest first-column reading.
    const first=p.cards!.map(c=>nums(c.value)[0]);
    const winner=p.cards!.findIndex(c=>c.label===q.answer);
    expect(first[winner]).toBeLessThan(Math.max(...first));
   }
   if(p.layout==='bars'){
    const sold=p.rows!.map(r=>r.parts[0].size);
    const m=/number of (\w+) (\w+) and the number of (\w+) (\w+) that were made/.exec(q.prompt)!;
    const at=(k:string)=>p.rows!.findIndex(r=>r.label===k);
    expect(Number(q.answer)).not.toBe(Math.abs(sold[at(m[1])]-sold[at(m[3])]));
    expect(Number(q.answer)).toBeGreaterThanOrEqual(2);
   }
   if(q.prompt.includes(' says that ')){
    answers.add(q.answer);
    const [a,b]=p.cards!.map(c=>nums(c.value));
    const sum=(v:number[])=>v.reduce((x,y)=>x+y,0);
    const wins=a.filter((v,i)=>v>b[i]).length;
    // The team with the higher total wins only one event.
    const higherWins=sum(a)>sum(b)?wins:a.length-wins;
    expect(higherWins).toBe(1);
   }
   if(p.type==='bars')expect(new Set(q.choices).size).toBe(4);
  }
  expect(answers).toEqual(new Set(['Yes','No']));
 });
});

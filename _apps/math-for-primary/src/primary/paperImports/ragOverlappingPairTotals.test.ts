import {describe,expect,it} from 'vitest';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragOverlappingPairTotals';

const grab=(pattern:RegExp,lines:string[]):number[]=>{
 for(const line of lines){const m=pattern.exec(line);if(m)return m.slice(1).map(Number);}
 throw new Error(`Missing given ${pattern}`);
};

/** Solves from the visible context and prompt only. */
function solve(q:Question):number{
 const c=q.context??[];
 if(q.prompt.includes('average mass')){
  const [pq]=grab(/boxes P and Q is (\d+) kg/,c),[qr]=grab(/boxes Q and R is (\d+) kg/,c),[k]=grab(/Box R is (\d+) times/,c);
  const x=(qr-pq)/(k-1),y=pq-x,z=k*x;
  return (x+y+z)/3;
 }
 if(q.prompt.includes('altogether')){
  const [a1]=grab(/Lin and Omar had was (\d+)/,c),[a2]=grab(/Lin and Pia had was (\d+)/,c),[k]=grab(/Omar's number is (\d+) times/,c);
  const pia=2*(a1-a2)/(k-1);
  return (k+1)*pia;
 }
 if(q.prompt.includes('Dev')){
  const [ab]=grab(/^Ann and Ben: (\d+) stickers/,c),[bc]=grab(/^Ben and Cara: (\d+) stickers/,c),[cd]=grab(/^Cara and Dev: (\d+) stickers/,c),[de]=grab(/^Dev and Eli: (\d+) stickers/,c),[avg]=grab(/five children is (\d+)/,c);
  const eli=5*avg-ab-cd,dev=de-eli,cara=cd-dev,ben=bc-cara,ann=ab-ben;
  const all=[ann,ben,cara,dev,eli];
  expect(all.every(n=>Number.isInteger(n)&&n>0)).toBe(true);
  expect(new Set(all).size).toBe(5);
  return dev;
 }
 const [p]=grab(/Ann and Ben have is (\d+)/,c),[q2]=grab(/Ben and Cara have is (\d+)/,c);
 return 2*(p-q2);
}

describe('overlapping pair totals generator',()=>{
 it('has valid metadata and existing curriculum skill ids',()=>{
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-overlapping-pair-totals');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
  expect(JSON.stringify(RAG_PATTERN)).not.toMatch(/Swastika|Hilda|Anglo|sgexam/i);
 });

 it('answers match an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=80;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),expected=solve(q);
   expect(Number.isInteger(expected)).toBe(true);
   expect(expected).toBeGreaterThan(0);
   expect(q.answer).toBe(String(expected));
  }
 });

 it('provides complete givens, hints and at least three worked steps for every variant',()=>{
  const prompts=new Set<string>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   prompts.add(q.prompt);
   expect((q.context??[]).length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation).not.toMatch(/NaN|undefined/);
   expect(q.workedSteps?.length??0).toBeGreaterThanOrEqual(3);
   for(const step of q.workedSteps??[]){
    expect(step.text.length).toBeGreaterThan(5);
    expect(step.equation).toBeTruthy();
    expect(step.equation).not.toMatch(/NaN|undefined/);
   }
  }
  expect(prompts.size).toBe(4);
 });

 it('is deterministic and has distinct keys for different seeds and indices',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const keys=new Set<string>();
  for(let seed=1;seed<=20;seed++)for(let index=0;index<4;index++)keys.add(makeRagQuestion(seed,index).key);
  expect(keys.size).toBe(80);
 });

 it('varies the numbers within a variant',()=>{
  const contexts=new Set<string>();
  for(let seed=1;seed<=30;seed++)contexts.add(JSON.stringify(makeRagQuestion(seed,0).context)+makeRagQuestion(seed*4,0).prompt);
  expect(contexts.size).toBeGreaterThan(10);
 });
});

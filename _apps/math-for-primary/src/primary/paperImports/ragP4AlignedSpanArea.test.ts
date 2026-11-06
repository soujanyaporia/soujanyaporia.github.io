import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP4AlignedSpanArea';
import type {Question} from '../generate';

const text=(q:Question)=>[...(q.context??[]),q.prompt].join(' ');
const num=(t:string,re:RegExp,group=1)=>{const m=re.exec(t);if(!m)throw new Error(`missing ${re}`);return Number(m[group]);};

/** Solves only from the visible wording, never from q.answer. */
function solve(q:Question):{area:number;kind:string}{
 const t=text(q);
 if(/identical squares/.test(t)){
  const n=num(t,/(\d+) identical squares/),span=num(t,/is (\d+) cm long/);
  expect(span%(n+1)).toBe(0);
  const side=span/(n+1);return {area:n*side*side,kind:'column'};
 }
 if(/top rectangle/.test(t)){
  const width=num(t,/(\d+) cm wide and (\d+) cm tall/,1),total=num(t,/(\d+) cm wide and (\d+) cm tall/,2),top=num(t,/top rectangle is (\d+) cm tall/);
  return {area:width*(total-top),kind:'strip'};
 }
 const side=num(t,/side (\d+) cm/),width=num(t,/B is (\d+) cm wide/),above=num(t,/leaving (\d+) cm/);
 return {area:width*(above+side),kind:'beside'};
}

describe('p4 aligned-span rectangle area',()=>{
 it('declares valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(4);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p4-rectangle-area-from-aligned-spans');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });
 it('matches an independent solution from visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=80;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),solved=solve(q);
   kinds.add(solved.kind);
   expect(Number(q.answer)).toBe(solved.area);
   expect(Number.isInteger(solved.area)&&solved.area>0).toBe(true);
   expect(q.unit).toBe('cm²');
   expect(q.choices).toBeUndefined();
   expect(q.hint.length).toBeGreaterThan(10);
   expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(2);
  }
  expect([...kinds].sort()).toEqual(['beside','column','strip']);
 });
 it('is deterministic and gives distinct keys',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const keys=new Set<string>();
  for(let i=0;i<30;i++)keys.add(makeRagQuestion(3,i).key);
  expect(keys.size).toBe(30);
 });
 it('does not reuse source labels or numbers wholesale',()=>{
  for(let i=0;i<60;i++){const t=text(makeRagQuestion(11,i));expect(t).not.toMatch(/BD|CDEF/);}
 });
});

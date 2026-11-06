import {describe,it,expect} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP4ShareComplement';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import type {Question} from '../generate';

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;

/** Solves only from the visible context and prompt: never reads q.answer or generation parameters. */
function solveVisible(q:Question){
 const text=[...(q.context??[]),q.prompt].join(' ');
 const fractions=[...text.matchAll(/(\d+)\/(\d+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 expect(fractions.length).toBe(2);
 let total:number;
 const groups=/There are (\d+) [a-z]+\. Each [a-z]+ holds (\d+) /.exec(text),dollars=/\$(\d+)/.exec(text),count=/has (\d+) /.exec(text);
 if(groups)total=Number(groups[1])*Number(groups[2]);
 else if(dollars)total=Number(dollars[1]);
 else if(count)total=Number(count[1]);
 else throw Error('No visible total');
 const [[a,d1],[b,d2]]=fractions,den=d1*d2,used=a*d2+b*d1;
 return {total,a,d1,b,d2,used,den,answer:total*(den-used)/den,kind:groups?'groups':dollars?'money':'count'};
}

describe('P4 complement of two shares of one whole',()=>{
 it('declares valid metadata and curriculum skills',()=>{
  expect(RAG_PATTERN.level).toBe(4);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p4-complement-of-two-shares-of-whole');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution from visible givens across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),s=solveVisible(q);
   kinds.add(s.kind);
   expect(Number.isInteger(s.answer)).toBe(true);
   expect(s.answer).toBeGreaterThan(0);
   expect(s.answer).toBeLessThan(s.total);
   expect(q.answer).toBe(String(s.answer));
  }
  expect([...kinds].sort()).toEqual(['count','groups','money']);
 });

 it('keeps fractions proper, different-denominator, simplest and below one whole in total',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const s=solveVisible(makeRagQuestion(seed,index));
   for(const [n,d] of [[s.a,s.d1],[s.b,s.d2]]){expect(n).toBeGreaterThan(0);expect(n).toBeLessThan(d);expect(d).toBeLessThanOrEqual(12);expect(gcd(n,d)).toBe(1);}
   expect(s.d1).not.toBe(s.d2);
   expect(s.used).toBeLessThan(s.den);
  }
 });

 it('is deterministic, has unique keys and shows consistent worked steps',()=>{
  const keys=new Set<string>();
  for(let seed=1;seed<=20;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   expect(makeRagQuestion(seed,index)).toEqual(q);
   keys.add(q.key);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.workedSteps!.at(-1)!.equation).toContain(`= ${q.unit==='dollars'?'$':''}${q.answer}`);
   expect(q.picture).toBeUndefined();
  }
  expect(keys.size).toBe(120);
 });

 it('does not reuse the source stamps and fractions',()=>{
  for(let seed=1;seed<=60;seed++){
   const text=[...(makeRagQuestion(seed,0).context??[])].join(' ');
   expect(text.includes('72 stamps')&&text.includes('1/6')&&text.includes('1/3')).toBe(false);
  }
 });
});

import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragWholeFromShareIncrease';
import type {Question} from '../generate';

/** Independent solver: reads only the visible context and prompt, never the stored answer. */
function solveVisible(q:Question){
 const text=[...(q.context??[]),q.prompt].join(' ');
 const fr=[...text.matchAll(/(\d+)\/(\d+)/g)].map(m=>[Number(m[1]),Number(m[2])] as [number,number]);
 const [ia,ib]=fr[0];
 let fn=0,fd=1,extra=0;
 if(text.includes('storybook')){
  extra=Number(/another (\d+) pages/.exec(text)![1]);
  const ratio=/read to pages not yet read was (\d+) : (\d+)/.exec(text);
  if(ratio){fn=Number(ratio[1]);fd=Number(ratio[1])+Number(ratio[2]);}
  else{const t=/was (twice|(\d+) times) the number of pages not yet read/.exec(text)!;const k=t[1]==='twice'?2:Number(t[2]);fn=k;fd=k+1;}
 }else if(text.includes('tokens')){
  extra=Number(/gave \w+ (\d+) more tokens/.exec(text)![1]);
  fn=fr[1][1]-fr[1][0];fd=fr[1][1];
 }else{
  extra=Number(/\$(\d+)/.exec(text)![1]);
  const ratio=/(\d+) : (\d+)/.exec(text)!;
  fn=Number(ratio[1]);fd=Number(ratio[2]);
 }
 const num=fn*ib-ia*fd;
 expect(num).toBeGreaterThan(0);
 return {whole:extra*fd*ib/num,ia,ib,fn,fd,extra};
}

describe('whole from share increase',()=>{
 it('declares valid metadata',()=>{
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-whole-from-share-increase');
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('answers match an independent solution of the visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),s=solveVisible(q);
   expect(Number.isInteger(s.whole)).toBe(true);
   expect(String(s.whole)).toBe(q.answer);
   expect(s.whole).toBeGreaterThanOrEqual(40);
   expect(s.whole).toBeLessThanOrEqual(600);
   // Forward check: share held at first plus the extra equals the final share of the whole.
   expect(s.ia*s.whole/s.ib+s.extra).toBeCloseTo(s.fn*s.whole/s.fd,9);
   expect(s.fn*s.whole%s.fd).toBe(0);
   expect(s.ia*s.whole%s.ib).toBe(0);
  }
 });

 it('cycles through all three variants and gives full worked solutions',()=>{
  const kinds=new Set<string>();
  for(let index=0;index<3;index++){
   const q=makeRagQuestion(5,index),text=[...(q.context??[]),q.prompt].join(' ');
   kinds.add(text.includes('storybook')?'completion':text.includes('tokens')?'unmet':'spending');
   expect(q.workedSteps?.length).toBe(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation).toContain(q.answer);
   expect(q.unit).toBeTruthy();
   expect(q.choices).toBeUndefined();
  }
  expect([...kinds].sort()).toEqual(['completion','spending','unmet']);
 });

 it('is deterministic, varied, and does not reuse source names',()=>{
  expect(makeRagQuestion(9,2)).toEqual(makeRagQuestion(9,2));
  const seen=new Set<string>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   seen.add(JSON.stringify([q.context,q.prompt]));
   expect(JSON.stringify(q)).not.toMatch(/Peter|Melvin|Nat\b|Mei Ling/);
  }
  expect(seen.size).toBeGreaterThan(40);
 });
});

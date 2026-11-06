import {describe,expect,it} from 'vitest';
import {correctAnswer} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragP2CategoryReference';

type Bars={type:string;labels:string[];values:number[];scale:number};

/** Solves only from the visible prompt, key and graph; never from the stored answer. */
function solve(q:ReturnType<typeof makeRagQuestion>){
 const pic=q.picture as unknown as Bars;
 expect(pic.type).toBe('bars');
 const scale=pic.scale;
 const keyed=Number(/stands for (\d+)/.exec((q.context??[]).join(' '))?.[1]);
 expect(keyed).toBe(scale);
 const counts=pic.values.map(v=>{expect(v%scale).toBe(0);return v/scale;});
 const ref=/(?:as|than) ([A-Za-z]+)\?$/.exec(q.prompt)?.[1] as string;
 const refIndex=pic.labels.indexOf(ref);
 expect(refIndex).toBeGreaterThanOrEqual(0);
 const refCount=counts[refIndex];
 let target:number,kind:string;
 if(/twice as many/.test(q.prompt)){target=refCount*2;kind='twice';}
 else if(/half as many/.test(q.prompt)){target=refCount/2;kind='half';}
 else{const amount=Number(/(\d+) more/.exec(q.prompt)?.[1]);expect(amount%scale).toBe(0);target=refCount+amount/scale;kind='more';}
 return {kind,matches:pic.labels.filter((_,i)=>counts[i]===target),labels:pic.labels,counts};
}

describe('P2 match a category to a reference',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(2);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p2-match-category-to-reference-count');
  expect(RAG_PATTERN.skillIds.every(id=>id.startsWith('P2.S.'))).toBe(true);
 });
 it('has exactly one matching category found independently from the visible graph',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),s=solve(q);
   kinds.add(s.kind);
   expect(s.matches).toHaveLength(1);
   expect(q.answer).toBe(s.matches[0]);
   expect(new Set(s.labels).size).toBe(s.labels.length);
   expect(new Set(s.counts).size).toBe(s.counts.length);
   expect(Math.max(...s.counts)).toBeLessThanOrEqual(8);
   expect(Math.min(...s.counts)).toBeGreaterThanOrEqual(1);
   expect(q.choices).toEqual(s.labels);
   expect(q.choices).toContain(q.answer);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(0);
   expect(correctAnswer(q,q.answer)).toBe(true);
   expect(correctAnswer(q,s.labels.find(l=>l!==q.answer) as string)).toBe(false);
  }
  expect([...kinds].sort()).toEqual(['half','more','twice']);
 });
 it('is deterministic and varies across indexes',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const keys=new Set(Array.from({length:12},(_,i)=>JSON.stringify([makeRagQuestion(3,i).prompt,makeRagQuestion(3,i).picture])));
  expect(keys.size).toBeGreaterThan(6);
 });
});

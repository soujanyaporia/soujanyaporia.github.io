import {describe,expect,it} from 'vitest';
import {makeRagQuestion,RAG_PATTERN} from './ragImmediateNeighbourRow';

/** Solve only from the visible prompt and picture; never from the stored answer. */
function solve(q:ReturnType<typeof makeRagQuestion>):string{
 if(q.picture?.type!=='pattern')throw new Error('row picture expected');
 const items=q.picture.items;
 const dir=/just after/.test(q.prompt)?1:/just before/.test(q.prompt)?-1:0;
 expect(dir).not.toBe(0);
 const ord=/the (\d+)(?:st|nd|rd|th) child/.exec(q.prompt);
 let at:number;
 if(ord)at=Number(ord[1])-1;
 else{
  const tokens=q.prompt.replace(/[?.,]/g,'').split(/\s+/);
  const found=items.filter(i=>tokens.includes(i));
  expect(found.length).toBe(1);
  at=items.indexOf(found[0]);
 }
 const result=items[at+dir];
 expect(result).toBeDefined();
 return result;
}

describe('immediate neighbour in a row',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(1);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p1-immediate-neighbour-in-row');
  expect(RAG_PATTERN.canonicalPatternId.startsWith('p1-')).toBe(true);
  expect(RAG_PATTERN.skillIds).toEqual(['P1.S.WN.06']);
 });
 it('matches an independent solution across seeds and variants',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.answer).toBe(solve(q));
   expect(q.choices).toContain(q.answer);
   seen.add(/just before/.test(q.prompt)?'before':/shape/.test(q.prompt)?'shape':/\d+(st|nd|rd|th) child/.test(q.prompt)?'ordinal':'named');
  }
  expect([...seen].sort()).toEqual(['before','named','ordinal','shape']);
 });
 it('has distinct row items and sensible choices',()=>{
  for(let seed=1;seed<=60;seed++){
   const q=makeRagQuestion(seed,seed%5);
   if(q.picture?.type!=='pattern')throw new Error('row picture expected');
   const items=q.picture.items;
   expect(new Set(items).size).toBe(items.length);
   expect(items.length).toBeGreaterThanOrEqual(5);
   expect(items.length).toBeLessThanOrEqual(9);
   expect(q.choices).toHaveLength(4);
   expect(new Set(q.choices).size).toBe(4);
   for(const c of q.choices!)expect(items).toContain(c);
   const ord=/the (\d+)(?:st|nd|rd|th) child/.exec(q.prompt);
   if(ord)expect(Number(ord[1])).toBeLessThanOrEqual(9);
  }
 });
 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set(Array.from({length:40},(_,i)=>makeRagQuestion(i+1,0)).map(q=>JSON.stringify([q.prompt,q.picture])));
  expect(prompts.size).toBeGreaterThan(20);
 });
 it('includes steps and does not copy source names',()=>{
  for(let seed=1;seed<=20;seed++){
   const q=makeRagQuestion(seed,1);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation).toContain(q.answer);
   const text=JSON.stringify(q);
   expect(text).not.toMatch(/Wong|taxi|Mrs Tan/i);
  }
 });
});

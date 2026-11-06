import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP4SumDifferenceQuantities';

/** Independent solver: reads only the visible context numbers. */
function solveVisible(context:string[]):number{
 const n=(context.join(' ').match(/\d+/g)??[]).map(Number);
 if(n.length===2)return (n[0]-n[1])/2; // total, difference
 if(n.length===4)return (n[0]-n[1]-n[2]-n[3])/2; // total, two known groups, difference
 if(n.length===3){const [d,k,total]=n;return (total/(k+1)-d)/2;} // difference, multiplier, grand total
 throw new Error('Unexpected givens');
}

describe('P4 two quantities from sum and difference',()=>{
 it('has the required metadata',()=>{
  expect(RAG_PATTERN.level).toBe(4);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p4-two-quantities-from-sum-and-difference');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });
 it('matches an independent solution of the visible givens across seeds',()=>{
  const counts=new Set<number>();
  for(let seed=1;seed<=40;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index);
   const expected=solveVisible(q.context!);
   counts.add(q.context!.join(' ').match(/\d+/g)!.length);
   expect(Number.isInteger(expected)).toBe(true);
   expect(expected).toBeGreaterThan(0);
   expect(Number(q.answer)).toBe(expected);
   expect(q.unit).toBeTruthy();
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
   expect(q.explanation.length).toBeGreaterThan(10);
   expect(q.workedSteps!.at(-1)!.equation).toContain(`= ${q.answer}`);
  }
  expect([...counts].sort()).toEqual([2,3,4]);
 });
 it('is deterministic and varies with the seed',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set(Array.from({length:30},(_,i)=>JSON.stringify(makeRagQuestion(i+1,0).context)));
  expect(prompts.size).toBeGreaterThan(20);
 });
});

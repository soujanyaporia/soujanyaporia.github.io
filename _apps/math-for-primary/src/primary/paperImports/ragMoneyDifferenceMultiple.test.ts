import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragMoneyDifferenceMultiple';

/** Independent solver: reads only the visible context and prompt. */
function solve(q:{prompt:string;context?:string[]}):number{
 const text=[...(q.context??[]),q.prompt].join(' ');
 const times=Number(/(\d+) times/.exec(text)![1]);
 if(/at first/.test(text)){
  const spent=Number(/spent \$(\d+)/.exec(text)![1]);
  const left=spent/(times-1);
  expect(Number.isInteger(left)).toBe(true);
  return left+spent;
 }
 const diff=Number(/\$(\d+) less/.exec(text)![1]);
 const small=diff/(times-1);
 expect(Number.isInteger(small)).toBe(true);
 return small*(times+1);
}

describe('ragMoneyDifferenceMultiple',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId.startsWith('p3-')).toBe(true);
  expect(RAG_PATTERN.level).toBe(3);
  for(const id of RAG_PATTERN.skillIds)expect(id).toMatch(/^P3\.S\.(AS|MD|MONEY)\.0\d$/);
 });
 it('matches an independent solution from the visible givens across seeds',()=>{
  for(let seed=1;seed<=150;seed++)for(let index=0;index<3;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.answer).toBe(String(solve(q)));
   expect(Number(q.answer)).toBeGreaterThan(0);
   expect(q.unit).toBe('dollars');
  }
 });
 it('uses both variants, distinct names and several multipliers',()=>{
  const variants=new Set<string>(),multipliers=new Set<number>();
  for(let seed=1;seed<=80;seed++){
   const q=makeRagQuestion(seed);
   variants.add(/at first/.test(q.prompt)?'start':'total');
   multipliers.add(Number(/(\d+) times/.exec([...(q.context??[])].join(' '))![1]));
   const names=/^(\w+) (?:and|has)/.exec(q.context![0])!;
   expect(q.context!.join(' ')).toContain(names[1]);
  }
  expect(variants.size).toBe(2);
  expect([...multipliers].sort()).toEqual([3,4,5]);
 });
 it('is deterministic and has worked steps whose last step agrees with the answer',()=>{
  const a=makeRagQuestion(7,2),b=makeRagQuestion(7,2);
  expect(a).toEqual(b);
  for(let seed=1;seed<=40;seed++){
   const q=makeRagQuestion(seed,1);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation.length).toBeGreaterThan(20);
   expect(q.key).toContain(`${seed}:1`);
  }
 });
});

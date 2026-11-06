import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragSumTensOnes';
import {correctAnswer} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';

/** Independent solver: reads only the visible prompt text. */
function solveFromPrompt(prompt:string):{tens:number;ones:number;a:number;b:number}{
 const m=/^Add (\d+) and (\d+)\./.exec(prompt);
 if(!m)throw new Error(`Unreadable prompt: ${prompt}`);
 const a=Number(m[1]),b=Number(m[2]),sum=a+b;
 return {tens:Math.floor(sum/10),ones:sum%10,a,b};
}

describe('p1 sum in tens and ones',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(1);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p1-sum-in-tens-and-ones');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution of the visible givens across seeds',()=>{
  const shapes=new Set<string>();
  for(let seed=0;seed<150;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),solved=solveFromPrompt(q.prompt);
   expect(q.display).toBe(`${solved.a} + ${solved.b}`);
   expect(JSON.parse(q.answer)).toEqual([String(solved.tens),String(solved.ones)]);
   // Every question needs regrouping of the ones and stays within 100.
   expect((solved.a%10)+(solved.b%10)).toBeGreaterThanOrEqual(10);
   expect(solved.a+solved.b).toBeLessThan(100);
   expect(q.structuredResponse?.kind).toBe('number-fields');
   expect(correctAnswer(q,JSON.stringify([String(solved.tens),String(solved.ones)]))).toBe(true);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(0);
   shapes.add([solved.a<10?'one-first':solved.b<10?'one-second':'two-two',solved.ones===0?'zero-ones':'some-ones'].join(':'));
  }
  expect(shapes.has('one-first:zero-ones')||shapes.has('one-second:zero-ones')).toBe(true);
  expect(shapes.has('one-first:some-ones')).toBe(true);
  expect(shapes.has('one-second:some-ones')).toBe(true);
  expect(shapes.has('two-two:some-ones')).toBe(true);
 });

 it('requires both place counts in the right order',()=>{
  for(let seed=1;seed<40;seed++){
   const q=makeRagQuestion(seed,0),{tens,ones}=solveFromPrompt(q.prompt);
   expect(correctAnswer(q,String(tens*10+ones))).toBe(false);
   expect(correctAnswer(q,JSON.stringify([String(tens)]))).toBe(false);
   expect(correctAnswer(q,JSON.stringify([String(tens),String(ones+1)]))).toBe(false);
   if(tens!==ones)expect(correctAnswer(q,JSON.stringify([String(ones),String(tens)]))).toBe(false);
  }
 });

 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set(Array.from({length:60},(_,i)=>makeRagQuestion(3,i).prompt));
  expect(prompts.size).toBeGreaterThan(30);
 });
});

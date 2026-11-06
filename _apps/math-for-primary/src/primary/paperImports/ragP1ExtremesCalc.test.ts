import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP1ExtremesCalc';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer} from '../generate';

/** Independent solver: reads only the visible prompt and number cards. */
function solve(q:ReturnType<typeof makeRagQuestion>):{answer:number;kind:'sum'|'range';numbers:number[]}{
 if(q.picture?.type!=='pattern')throw new Error('Expected visible number cards');
 const numbers=q.picture.items.map(Number);
 const high=Math.max(...numbers),low=Math.min(...numbers);
 if(/^Look at the number cards\. Add /.test(q.prompt))return {answer:high+low,kind:'sum',numbers};
 if(/How much bigger/.test(q.prompt))return {answer:high-low,kind:'range',numbers};
 throw new Error('Unknown task wording');
}

describe('P1 extremes calculation generator',()=>{
 it('declares valid metadata and curriculum skills',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(1);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p1-calculate-with-the-extremes');
  const ids=new Set(CURRICULUM_SKILLS.map(s=>s.id));
  for(const id of RAG_PATTERN.skillIds)expect(ids.has(id)).toBe(true);
 });

 it('matches an independent solution from the visible cards across seeds',()=>{
  const kinds=new Set<string>();
  for(let seed=1;seed<=60;seed++)for(let index=0;index<6;index++){
   const q=makeRagQuestion(seed,index),solved=solve(q);
   kinds.add(solved.kind);
   expect(q.answer).toBe(String(solved.answer));
   expect(correctAnswer(q,String(solved.answer))).toBe(true);
   expect(new Set(solved.numbers).size).toBe(solved.numbers.length);
   expect(solved.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=99)).toBe(true);
   if(solved.kind==='sum'){
    expect(solved.numbers.length).toBeGreaterThanOrEqual(5);
    expect(solved.numbers.every(n=>n<=20)).toBe(true);
   }else{
    expect(solved.numbers).toHaveLength(4);
    expect(solved.answer).toBeGreaterThanOrEqual(20);
   }
   expect(solved.answer).toBeGreaterThan(0);
  }
  expect(kinds).toEqual(new Set(['sum','range']));
 });

 it('is deterministic and has worked steps, hint and explanation',()=>{
  const a=makeRagQuestion(7,3),b=makeRagQuestion(7,3);
  expect(a).toEqual(b);
  expect(makeRagQuestion(7,4).key).not.toBe(a.key);
  for(let i=0;i<20;i++){
   const q=makeRagQuestion(11,i);
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(10);
   expect(q.explanation).toContain(q.answer);
   expect(q.workedSteps!.at(-1)!.equation).toContain(`= ${q.answer}`);
  }
 });

 it('rejects wrong extremes such as the wrong pair',()=>{
  const q=makeRagQuestion(5,0),solved=solve(q);
  expect(correctAnswer(q,String(solved.answer+1))).toBe(false);
 });
});

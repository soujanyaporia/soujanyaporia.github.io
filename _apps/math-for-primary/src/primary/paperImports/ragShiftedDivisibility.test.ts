import {describe,expect,it} from 'vitest';
import type {Question} from '../generate';
import {RAG_PATTERN,makeRagQuestion} from './ragShiftedDivisibility';

const num=(m:RegExpExecArray,i:number)=>Number(m[i]);
type Solved={variant:'number'|'age'|'pair';solutions:number[]};

/** Independent solver: reads only the visible context and prompt. */
function solve(q:Question):Solved{
 const text=(q.context??[]).join(' ');
 const A=/^A number is a multiple of (\d+)\. When (\d+) is added, the new number is a multiple of (\d+)\. The number is greater than (\d+) and less than (\d+)\.$/.exec(text);
 if(A){
  const a=num(A,1),s=num(A,2),c=num(A,3),lo=num(A,4),hi=num(A,5),solutions:number[]=[];
  expect(q.prompt).toBe('What is the number?');
  for(let x=lo+1;x<hi;x++)if(x%a===0&&(x+s)%c===0)solutions.push(x);
  return {variant:'number',solutions};
 }
 const B=/^(.+?)'s age this year is a multiple of (\d+)\. (?:Next year|In (\d+) years' time), (.+?)'s age will be a multiple of (\d+)\. (.+?) is older than (\d+) and younger than (\d+)\.$/.exec(text);
 if(B){
  const name=String(B[1]),a=num(B,2),s=B[3]===undefined?1:num(B,3),c=num(B,5),lo=num(B,7),hi=num(B,8),solutions:number[]=[];
  expect(String(B[4])).toBe(name);
  expect(String(B[6])).toBe(name);
  expect(q.prompt).toBe(`How old is ${name}?`);
  for(let x=lo+1;x<hi;x++)if(x%a===0&&(x+s)%c===0)solutions.push(x);
  return {variant:'age',solutions};
 }
 const C=/^(.+?)'s age is a multiple of (\d+)\. (.+?)'s age is a multiple of (\d+)\. Both ages are less than (\d+)\. (.+?) is (\d+) years older than (.+?)\.$/.exec(text);
 if(C){
  const older=String(C[1]),a=num(C,2),younger=String(C[3]),b=num(C,4),limit=num(C,5),d=num(C,7),solutions:number[]=[];
  expect(String(C[6])).toBe(older);
  expect(String(C[8])).toBe(younger);
  expect(older).not.toBe(younger);
  expect(q.prompt).toBe(`How old is ${older}?`);
  for(let x=1;x<limit;x++){
   const y=x-d;
   if(x%a===0&&y>=1&&y<limit&&y%b===0)solutions.push(x);
  }
  return {variant:'pair',solutions};
 }
 throw new Error(`Unrecognised givens: ${text}`);
}

describe('shifted divisibility constraints',()=>{
 it('exports consistent pattern metadata',()=>{
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-shifted-divisibility-constraints');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });

 it('has exactly one solution matching the stored answer for the visible givens',()=>{
  const seen=new Set<string>();
  for(let seed=1;seed<=60;seed++){
   for(let index=0;index<3;index++){
    const q=makeRagQuestion(seed,index),solved=solve(q);
    seen.add(solved.variant);
    expect(solved.solutions).toHaveLength(1);
    expect(solved.solutions[0]).toBe(Number(q.answer));
   }
  }
  expect([...seen].sort()).toEqual(['age','number','pair']);
 });

 it('is deterministic and varied',()=>{
  const distinct=new Set<string>();
  for(let seed=1;seed<=60;seed++){
   for(let index=0;index<3;index++){
    const q=makeRagQuestion(seed,index);
    expect(makeRagQuestion(seed,index)).toEqual(q);
    distinct.add(JSON.stringify([q.prompt,q.context,q.answer]));
   }
  }
  expect(distinct.size).toBeGreaterThanOrEqual(30);
 });

 it('supplies hint, units, worked steps and explanation',()=>{
  for(let seed=1;seed<=30;seed++){
   for(let index=0;index<3;index++){
    const q=makeRagQuestion(seed,index),solved=solve(q);
    expect(q.hint.length).toBeGreaterThan(0);
    expect((q.workedSteps??[]).length).toBeGreaterThanOrEqual(3);
    for(const step of q.workedSteps??[])expect(step.text.length).toBeGreaterThan(0);
    expect(q.explanation.length).toBeGreaterThan(0);
    if(solved.variant==='number')expect(q.unit).toBeUndefined();
    else expect(q.unit).toBe('years');
    expect(q.picture).toBeUndefined();
   }
  }
 });
});

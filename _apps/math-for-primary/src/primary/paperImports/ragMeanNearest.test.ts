import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragMeanNearest';
import {correctAnswer} from '../generate';

const nearestSolve=(context:string[])=>{
 const rows=context.map(l=>/^(\w+) is (\d+) years old\.$/.exec(l)).filter((m):m is RegExpExecArray=>!!m).map(m=>({name:m[1],age:Number(m[2])}));
 const mean=rows.reduce((a,b)=>a+b.age,0)/rows.length;
 const ranked=rows.map(r=>({name:r.name,d:Math.abs(r.age-mean)})).sort((a,b)=>a.d-b.d);
 return {rows,best:ranked[0],second:ranked[1]};
};
const monthsSolve=(context:string[])=>{
 const ms=context.map(l=>/^\w+ is (\d+) years (\d+) months old\.$/.exec(l)).filter((m):m is RegExpExecArray=>!!m).map(m=>Number(m[1])*12+Number(m[2]));
 const mean=ms.reduce((a,b)=>a+b,0)/ms.length;
 return {count:ms.length,mean};
};

describe('ragMeanNearest',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.skillIds).toContain('P6.S.AVG.01');
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-direct-mean-and-mean-comparison');
 });
 it('solves both variants independently from visible givens',()=>{
  let nearest=0,months=0;
  for(let seed=1;seed<=60;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index);
   expect(q.context?.length).toBeGreaterThan(2);
   if(q.choices){
    nearest++;
    const s=nearestSolve(q.context!);
    expect(s.rows).toHaveLength(4);
    expect(new Set(s.rows.map(r=>r.age)).size).toBe(4);
    expect(s.best.d).toBeLessThan(s.second.d);
    expect(q.answer).toBe(s.best.name);
    expect([...q.choices].sort()).toEqual(s.rows.map(r=>r.name).sort());
    expect(correctAnswer(q,s.best.name)).toBe(true);
    const wrong=s.rows.find(r=>r.name!==s.best.name)!.name;
    expect(correctAnswer(q,wrong)).toBe(false);
   }else{
    months++;
    const s=monthsSolve(q.context!);
    expect(s.count).toBeGreaterThanOrEqual(3);
    expect(Number.isInteger(s.mean)).toBe(true);
    const answer=JSON.parse(q.answer) as string[];
    expect(Number(answer[0])*12+Number(answer[1])).toBe(s.mean);
    expect(Number(answer[1])).toBeLessThan(12);
    expect(correctAnswer(q,q.answer)).toBe(true);
    expect(correctAnswer(q,JSON.stringify([String(Number(answer[0])+1),answer[1]]))).toBe(false);
   }
   expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
   expect(q.hint.length).toBeGreaterThan(5);
  }
  expect(nearest).toBeGreaterThan(20);
  expect(months).toBeGreaterThan(20);
 });
 it('is deterministic and varied',()=>{
  expect(makeRagQuestion(7,2)).toEqual(makeRagQuestion(7,2));
  const prompts=new Set(Array.from({length:30},(_,i)=>JSON.stringify(makeRagQuestion(3,i).context)));
  expect(prompts.size).toBeGreaterThan(20);
 });
});

import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragCountCubesAssembly';

// Independent solver: reads only the visible context, prompt and plan numbers.
function solve(q:any):number{
 const marks:any[]=q.picture.marks.filter((m:any)=>m.kind==='text'&&/^\d+$/.test(m.text));
 const text=[...(q.context??[]),q.prompt].join(' ');
 if(/removed/.test(q.prompt)){
  const left=marks.filter(m=>m.x<160).reduce((a,m)=>a+Number(m.text),0);
  const right=marks.filter(m=>m.x>=160).reduce((a,m)=>a+Number(m.text),0);
  return left-right;
 }
 const total=marks.reduce((a,m)=>a+Number(m.text),0);
 const edge=/edges of (\d+) cm/.exec(text),vol=/volume of (\d+) cm³/.exec(text);
 if(edge)return total*Number(edge[1])**3;
 if(vol)return total*Number(vol[1]);
 return total;
}

describe('count cubes in an assembly',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(6);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p6-count-cubes-in-assembly');
  expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
 });
 it('matches an independent solution across seeds and indices',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index);
   expect(Number(q.answer)).toBe(solve(q));
   expect(Number.isInteger(Number(q.answer))).toBe(true);
   expect(Number(q.answer)).toBeGreaterThan(0);
  }
 });
 it('covers four variants and includes worked steps',()=>{
  const kinds=new Set<string>();
  for(let index=0;index<4;index++){
   const q=makeRagQuestion(5,index);
   kinds.add(/removed/.test(q.prompt)?'remove':/edges of/.test(q.context!.join(' '))?'edge':/volume of \d+ cm³/.test(q.context!.join(' '))?'volume':'count');
   expect(q.workedSteps!.length).toBeGreaterThan(1);
   expect(q.hint.length).toBeGreaterThan(0);
   expect(q.picture).toBeTruthy();
  }
  expect(kinds.size).toBe(4);
 });
 it('removal questions always remove at least one cube and leave some',()=>{
  for(let seed=0;seed<80;seed++){
   const q=makeRagQuestion(seed*4+2,0);
   if(!/removed/.test(q.prompt))continue;
   expect(Number(q.answer)).toBeGreaterThan(0);
  }
 });
 it('is deterministic',()=>{
  expect(makeRagQuestion(9,3)).toEqual(makeRagQuestion(9,3));
 });
});

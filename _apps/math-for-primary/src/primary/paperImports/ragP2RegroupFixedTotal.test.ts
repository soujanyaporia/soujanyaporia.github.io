import {describe,expect,it} from 'vitest';
import {RAG_PATTERN,makeRagQuestion} from './ragP2RegroupFixedTotal';
import {correctAnswer} from '../generate';

// Independent solver: reads only the visible story givens (group count, group size, new group size).
function solveVisible(q:ReturnType<typeof makeRagQuestion>){
 const nums=(q.context??[]).join(' ').match(/\d+/g)?.map(Number)??[];
 expect(nums).toHaveLength(3);
 const [groups,size,newSize]=nums;
 return {groups,size,newSize,answer:(groups*size)/newSize};
}

describe('P2 regroup a fixed total',()=>{
 it('has valid metadata',()=>{
  expect(RAG_PATTERN.level).toBe(2);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p2-regroup-fixed-total-group-count');
  expect(RAG_PATTERN.skillIds).toEqual(['P2.S.MD.01','P2.S.MD.02']);
 });
 it('matches an independent solution of the visible givens across seeds',()=>{
  for(let seed=1;seed<=60;seed++)for(let index=0;index<8;index++){
   const q=makeRagQuestion(seed,index),v=solveVisible(q);
   expect(Number.isInteger(v.answer)).toBe(true);
   expect(v.answer).toBeGreaterThanOrEqual(2);
   expect((v.groups*v.size)%v.newSize).toBe(0);
   expect(v.newSize).not.toBe(v.size);
   expect(q.answer).toBe(String(v.answer));
   expect(correctAnswer(q,String(v.answer))).toBe(true);
   expect(correctAnswer(q,String(v.answer+1))).toBe(false);
  }
 });
 it('shows the same givens in the picture and has explicit worked steps',()=>{
  for(let seed=1;seed<=20;seed++){
   const q=makeRagQuestion(seed,seed),v=solveVisible(q);
   const pic=q.picture as {type:string;layout:string;cards:{value:string}[]};
   expect(pic.type).toBe('paper');
   expect(pic.cards.map(c=>Number(c.value))).toEqual([v.groups,v.size,v.newSize]);
   expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
   expect(q.workedSteps?.[0].equation).toContain(`${v.groups} × ${v.size}`);
   expect(q.hint.length).toBeGreaterThan(5);
   expect(q.explanation).toContain(String(v.answer));
  }
 });
 it('has valid multiple-choice options when choices are used',()=>{
  let sawChoice=false,sawEntry=false;
  for(let seed=1;seed<=40;seed++)for(let index=0;index<4;index++){
   const q=makeRagQuestion(seed,index),v=solveVisible(q);
   if(q.choices){
    sawChoice=true;
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices.filter(c=>Number(c)===v.answer)).toHaveLength(1);
   }else sawEntry=true;
  }
  expect(sawChoice&&sawEntry).toBe(true);
 });
 it('is deterministic and varies the story',()=>{
  expect(makeRagQuestion(7,3)).toEqual(makeRagQuestion(7,3));
  const prompts=new Set([0,1,2,3].map(i=>makeRagQuestion(5,i).prompt));
  expect(prompts.size).toBe(4);
  const keys=new Set(Array.from({length:30},(_,i)=>JSON.stringify(makeRagQuestion(3,i).context)));
  expect(keys.size).toBeGreaterThan(8);
 });
});
